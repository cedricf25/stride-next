"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type {
  CreateMealInput,
  FoodInput,
  DailyNutrition,
  NutritionGoalInput,
  NutritionGoalData,
  MetabolismResult,
  NutritionDayHistory,
  MealWithFoods,
  FavoriteMealData,
  MealType,
} from "@/types/nutrition";

// ==========================================
// MÉTABOLISME
// ==========================================

/**
 * Calcule le BMR avec la formule Mifflin-St Jeor
 */
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

/**
 * Calcule l'âge à partir de la date de naissance
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

/**
 * Calcule le métabolisme (BMR + TDEE) basé sur le profil utilisateur
 * et les calories dépensées via Garmin sur les 7 derniers jours
 */
export async function calculateMetabolism(): Promise<
  MetabolismResult | { error: string }
> {
  const user = await getAuthenticatedUser();

  // Vérifier les données nécessaires
  if (!user.weight || !user.height) {
    return { error: "Poids et taille requis dans le profil" };
  }
  if (!user.birthDate) {
    return { error: "Date de naissance requise dans le profil" };
  }
  if (!user.gender) {
    return { error: "Genre requis dans le profil" };
  }

  const age = calculateAge(user.birthDate);
  const bmr = Math.round(
    calculateBMR(user.weight, user.height, age, user.gender)
  );

  // Récupérer les calories actives des 7 derniers jours via HealthMetric
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const healthMetrics = await prisma.healthMetric.findMany({
    where: {
      userId: user.id,
      calendarDate: { gte: sevenDaysAgo },
      activeCalories: { not: null },
    },
    select: { activeCalories: true },
  });

  // Calculer la moyenne des calories actives
  const totalActiveCalories = healthMetrics.reduce(
    (sum, m) => sum + (m.activeCalories ?? 0),
    0
  );
  const daysWithData = healthMetrics.length;
  const avgActiveCalories =
    daysWithData > 0 ? Math.round(totalActiveCalories / daysWithData) : 0;

  // TDEE = BMR + calories actives moyennes
  const tdee = bmr + avgActiveCalories;

  return {
    bmr,
    tdee,
    avgActiveCalories,
    daysWithData,
  };
}

/**
 * Sauvegarde ou met à jour les objectifs nutritionnels
 */
export async function saveNutritionGoal(
  data: NutritionGoalInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();

  // Calculer le métabolisme pour avoir BMR et TDEE
  const metabolism = await calculateMetabolism();
  if ("error" in metabolism) {
    return { success: false, error: metabolism.error };
  }

  try {
    await prisma.nutritionGoal.upsert({
      where: { userId: user.id },
      update: {
        bmr: metabolism.bmr,
        tdee: metabolism.tdee,
        targetCalories: data.targetCalories,
        targetProtein: data.targetProtein ?? null,
        targetCarbs: data.targetCarbs ?? null,
        targetFat: data.targetFat ?? null,
        weeklyWeightGoal: data.weeklyWeightGoal ?? null,
      },
      create: {
        userId: user.id,
        bmr: metabolism.bmr,
        tdee: metabolism.tdee,
        targetCalories: data.targetCalories,
        targetProtein: data.targetProtein ?? null,
        targetCarbs: data.targetCarbs ?? null,
        targetFat: data.targetFat ?? null,
        weeklyWeightGoal: data.weeklyWeightGoal ?? null,
      },
    });

    revalidatePath("/nutrition");
    revalidatePath("/nutrition/settings");
    return { success: true };
  } catch (error) {
    console.error("Error saving nutrition goal:", error);
    return { success: false, error: "Erreur lors de la sauvegarde" };
  }
}

/**
 * Récupère les objectifs nutritionnels de l'utilisateur
 */
export async function fetchNutritionGoal(): Promise<NutritionGoalData | null> {
  const user = await getAuthenticatedUser();

  const goal = await prisma.nutritionGoal.findUnique({
    where: { userId: user.id },
  });

  return goal;
}

// ==========================================
// REPAS
// ==========================================

/**
 * Crée un nouveau repas
 */
export async function createMeal(
  data: CreateMealInput
): Promise<{ mealId: string } | { error: string }> {
  const user = await getAuthenticatedUser();

  try {
    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        date: new Date(data.date),
        mealType: data.mealType,
        name: data.name ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/nutrition");
    return { mealId: meal.id };
  } catch (error) {
    console.error("Error creating meal:", error);
    return { error: "Erreur lors de la création du repas" };
  }
}

/**
 * Ajoute un aliment à un repas et recalcule les totaux
 */
export async function addFoodToMeal(
  mealId: string,
  food: FoodInput
): Promise<{ foodId: string } | { error: string }> {
  const user = await getAuthenticatedUser();

  // Vérifier que le repas appartient à l'utilisateur
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: user.id },
  });

  if (!meal) {
    return { error: "Repas non trouvé" };
  }

  try {
    const createdFood = await prisma.food.create({
      data: {
        mealId,
        name: food.name,
        quantity: food.quantity,
        unit: food.unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: food.source ?? "manual",
        confidence: food.confidence ?? null,
      },
    });

    // Recalculer les totaux du repas
    await updateMealTotals(mealId);

    revalidatePath("/nutrition");
    return { foodId: createdFood.id };
  } catch (error) {
    console.error("Error adding food:", error);
    return { error: "Erreur lors de l'ajout de l'aliment" };
  }
}

/**
 * Recalcule les totaux d'un repas
 */
export async function updateMealTotals(mealId: string): Promise<void> {
  const foods = await prisma.food.findMany({
    where: { mealId },
  });

  const totals = foods.reduce(
    (acc, food) => ({
      totalCalories: acc.totalCalories + food.calories,
      totalProtein: acc.totalProtein + food.protein,
      totalCarbs: acc.totalCarbs + food.carbs,
      totalFat: acc.totalFat + food.fat,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );

  await prisma.meal.update({
    where: { id: mealId },
    data: totals,
  });
}

/**
 * Supprime un aliment et recalcule les totaux
 */
export async function removeFood(
  foodId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();

  const food = await prisma.food.findUnique({
    where: { id: foodId },
    include: { meal: true },
  });

  if (!food || food.meal.userId !== user.id) {
    return { success: false, error: "Aliment non trouvé" };
  }

  try {
    await prisma.food.delete({ where: { id: foodId } });
    await updateMealTotals(food.mealId);

    revalidatePath("/nutrition");
    return { success: true };
  } catch (error) {
    console.error("Error removing food:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

/**
 * Supprime un repas complet
 */
export async function deleteMeal(
  mealId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();

  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: user.id },
  });

  if (!meal) {
    return { success: false, error: "Repas non trouvé" };
  }

  try {
    await prisma.meal.delete({ where: { id: mealId } });

    revalidatePath("/nutrition");
    return { success: true };
  } catch (error) {
    console.error("Error deleting meal:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

// ==========================================
// LECTURE DONNÉES
// ==========================================

/**
 * Récupère le journal nutritionnel d'une journée
 */
export async function fetchDailyNutrition(
  dateStr: string
): Promise<DailyNutrition> {
  const user = await getAuthenticatedUser();
  const date = new Date(dateStr);

  // Récupérer les repas du jour avec leurs aliments
  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      date,
    },
    include: {
      foods: true,
      analysis: { select: { id: true } },
    },
    orderBy: [
      {
        mealType: "asc",
      },
      { createdAt: "asc" },
    ],
  });

  // Formater les repas
  const formattedMeals: MealWithFoods[] = meals.map((meal) => ({
    id: meal.id,
    userId: meal.userId,
    date: meal.date,
    mealType: meal.mealType as MealType,
    name: meal.name,
    notes: meal.notes,
    imageData: meal.imageData,
    imageMimeType: meal.imageMimeType,
    totalCalories: meal.totalCalories,
    totalProtein: meal.totalProtein,
    totalCarbs: meal.totalCarbs,
    totalFat: meal.totalFat,
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
    foods: meal.foods.map((food) => ({
      id: food.id,
      mealId: food.mealId,
      name: food.name,
      quantity: food.quantity,
      unit: food.unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: food.source as "manual" | "ai_vision" | "favorite",
      confidence: food.confidence ?? undefined,
      createdAt: food.createdAt,
    })),
    hasAnalysis: meal.analysis !== null,
  }));

  // Calculer les totaux de la journée
  const totals = formattedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.totalCalories,
      protein: acc.protein + meal.totalProtein,
      carbs: acc.carbs + meal.totalCarbs,
      fat: acc.fat + meal.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Récupérer les objectifs
  const goal = await fetchNutritionGoal();

  // Récupérer les calories brûlées par les activités du jour
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
    where: {
      userId: user.id,
      startTimeLocal: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: { calories: true },
  });

  const activitiesCalories = activities.reduce(
    (sum, a) => sum + (a.calories ?? 0),
    0
  );

  // Calculer la balance (entrées - dépenses)
  // Dépenses = BMR journalier + activités
  const bmr = goal?.bmr ?? 0;
  const expenditure = bmr + activitiesCalories;
  const balance = totals.calories - expenditure;

  return {
    date: dateStr,
    meals: formattedMeals,
    totals,
    goal,
    activitiesCalories,
    balance,
  };
}

/**
 * Récupère l'historique nutritionnel sur N jours
 */
export async function fetchNutritionHistory(
  days: number = 30
): Promise<NutritionDayHistory[]> {
  const user = await getAuthenticatedUser();
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Récupérer tous les repas
  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      date: { gte: since },
    },
    select: {
      date: true,
      totalCalories: true,
    },
  });

  // Récupérer les objectifs pour le BMR
  const goal = await fetchNutritionGoal();
  const bmr = goal?.bmr ?? 0;

  // Récupérer les activités
  const activities = await prisma.activity.findMany({
    where: {
      userId: user.id,
      startTimeLocal: { gte: since },
    },
    select: {
      startTimeLocal: true,
      calories: true,
    },
  });

  // Construire l'historique par jour
  const history: Map<string, NutritionDayHistory> = new Map();

  // Initialiser tous les jours
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    history.set(dateStr, {
      date: dateStr,
      intake: 0,
      expenditure: bmr,
      balance: -bmr,
      mealsCount: 0,
    });
  }

  // Ajouter les calories consommées
  for (const meal of meals) {
    const dateStr = meal.date.toISOString().split("T")[0];
    const day = history.get(dateStr);
    if (day) {
      day.intake += meal.totalCalories;
      day.mealsCount++;
      day.balance = day.intake - day.expenditure;
    }
  }

  // Ajouter les calories des activités
  for (const activity of activities) {
    const dateStr = activity.startTimeLocal.toISOString().split("T")[0];
    const day = history.get(dateStr);
    if (day) {
      day.expenditure += activity.calories ?? 0;
      day.balance = day.intake - day.expenditure;
    }
  }

  // Convertir en tableau trié par date
  return Array.from(history.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Récupère la balance de la semaine en cours
 */
export async function fetchWeeklyBalance(): Promise<{
  totalIntake: number;
  totalExpenditure: number;
  balance: number;
  daysLogged: number;
}> {
  const user = await getAuthenticatedUser();

  // Début de semaine (lundi)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // Récupérer les repas de la semaine
  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      date: { gte: monday },
    },
    select: { totalCalories: true, date: true },
  });

  // Récupérer les activités de la semaine
  const activities = await prisma.activity.findMany({
    where: {
      userId: user.id,
      startTimeLocal: { gte: monday },
    },
    select: { calories: true },
  });

  // Récupérer le BMR
  const goal = await fetchNutritionGoal();
  const bmr = goal?.bmr ?? 0;

  // Calculer le nombre de jours écoulés cette semaine
  const daysElapsed = Math.ceil(
    (today.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Compter les jours avec au moins un repas
  const daysWithMeals = new Set(
    meals.map((m) => m.date.toISOString().split("T")[0])
  ).size;

  const totalIntake = meals.reduce((sum, m) => sum + m.totalCalories, 0);
  const activitiesCalories = activities.reduce(
    (sum, a) => sum + (a.calories ?? 0),
    0
  );
  const totalExpenditure = bmr * daysElapsed + activitiesCalories;
  const balance = totalIntake - totalExpenditure;

  return {
    totalIntake,
    totalExpenditure,
    balance,
    daysLogged: daysWithMeals,
  };
}

// ==========================================
// REPAS FAVORIS
// ==========================================

/**
 * Sauvegarde un repas comme favori
 */
export async function saveFavoriteMeal(
  mealId: string,
  name: string
): Promise<{ favoriteId: string } | { error: string }> {
  const user = await getAuthenticatedUser();

  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: user.id },
    include: { foods: true },
  });

  if (!meal) {
    return { error: "Repas non trouvé" };
  }

  try {
    const foodsJson = meal.foods.map((f) => ({
      name: f.name,
      quantity: f.quantity,
      unit: f.unit,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
    }));

    const favorite = await prisma.favoriteMeal.create({
      data: {
        userId: user.id,
        name,
        mealType: meal.mealType,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFat: meal.totalFat,
        foods: JSON.stringify(foodsJson),
      },
    });

    revalidatePath("/nutrition/favorites");
    return { favoriteId: favorite.id };
  } catch (error) {
    console.error("Error saving favorite meal:", error);
    return { error: "Erreur lors de la sauvegarde" };
  }
}

/**
 * Récupère tous les repas favoris
 */
export async function fetchFavoriteMeals(): Promise<FavoriteMealData[]> {
  const user = await getAuthenticatedUser();

  const favorites = await prisma.favoriteMeal.findMany({
    where: { userId: user.id },
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
  });

  return favorites.map((f) => ({
    id: f.id,
    userId: f.userId,
    name: f.name,
    mealType: f.mealType as MealType,
    totalCalories: f.totalCalories,
    totalProtein: f.totalProtein,
    totalCarbs: f.totalCarbs,
    totalFat: f.totalFat,
    foods: JSON.parse(f.foods) as FoodInput[],
    usageCount: f.usageCount,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}

/**
 * Applique un repas favori à une date/type donné
 */
export async function applyFavoriteMeal(
  favoriteId: string,
  dateStr: string,
  mealType: MealType
): Promise<{ mealId: string } | { error: string }> {
  const user = await getAuthenticatedUser();

  const favorite = await prisma.favoriteMeal.findFirst({
    where: { id: favoriteId, userId: user.id },
  });

  if (!favorite) {
    return { error: "Favori non trouvé" };
  }

  try {
    // Créer le nouveau repas
    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        date: new Date(dateStr),
        mealType,
        name: favorite.name,
        totalCalories: favorite.totalCalories,
        totalProtein: favorite.totalProtein,
        totalCarbs: favorite.totalCarbs,
        totalFat: favorite.totalFat,
      },
    });

    // Ajouter les aliments
    const foods = JSON.parse(favorite.foods) as FoodInput[];
    await prisma.food.createMany({
      data: foods.map((f) => ({
        mealId: meal.id,
        name: f.name,
        quantity: f.quantity,
        unit: f.unit,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        source: "favorite",
      })),
    });

    // Incrémenter le compteur d'utilisation
    await prisma.favoriteMeal.update({
      where: { id: favoriteId },
      data: { usageCount: { increment: 1 } },
    });

    revalidatePath("/nutrition");
    return { mealId: meal.id };
  } catch (error) {
    console.error("Error applying favorite meal:", error);
    return { error: "Erreur lors de l'application du favori" };
  }
}

/**
 * Supprime un repas favori
 */
export async function deleteFavoriteMeal(
  favoriteId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();

  const favorite = await prisma.favoriteMeal.findFirst({
    where: { id: favoriteId, userId: user.id },
  });

  if (!favorite) {
    return { success: false, error: "Favori non trouvé" };
  }

  try {
    await prisma.favoriteMeal.delete({ where: { id: favoriteId } });

    revalidatePath("/nutrition/favorites");
    return { success: true };
  } catch (error) {
    console.error("Error deleting favorite meal:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

// ==========================================
// PROFIL UTILISATEUR (Nutrition)
// ==========================================

/**
 * Met à jour les informations de profil liées à la nutrition
 */
export async function updateNutritionProfile(data: {
  birthDate?: string;
  gender?: "male" | "female";
  weight?: number;
  height?: number;
}): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        gender: data.gender ?? undefined,
        weight: data.weight ?? undefined,
        height: data.height ?? undefined,
      },
    });

    revalidatePath("/nutrition/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating nutrition profile:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}
