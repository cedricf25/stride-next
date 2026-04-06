"use server";

import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type { PhotoAnalysisResult, FoodInput, MealType } from "@/types/nutrition";
import { fetchNutritionHistory, fetchNutritionGoal, updateMealTotals } from "./nutrition";

// ==========================================
// CONFIGURATION
// ==========================================

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY must be set in .env.local");
  }
  return new GoogleGenAI({ apiKey });
}

// ==========================================
// PROMPTS
// ==========================================

const PHOTO_ANALYSIS_PROMPT = `Tu es un nutritionniste expert. Analyse cette photo de repas ou d'aliment.

Pour chaque aliment visible, estime :
1. Nom en français
2. Quantité approximative d'UNE SEULE portion/pièce (grammes ou ml)
3. Calories pour UNE portion
4. Macronutriments pour UNE portion (protéines, glucides, lipides en grammes)
5. Score de confiance (0-100) sur ton estimation

IMPORTANT : si tu vois plusieurs exemplaires du même aliment (ex: 2 tartelettes, 3 sushis), crée UNE SEULE entrée avec quantity = poids d'une pièce et numberOfItems = nombre de pièces. Les valeurs nutritionnelles (calories, protein, carbs, fat) doivent correspondre à UNE SEULE pièce.

Réponds UNIQUEMENT avec un JSON valide selon ce schéma :
{
  "foods": [
    {
      "name": "string",
      "quantity": number,
      "numberOfItems": number,
      "unit": "g" | "ml" | "portion",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "confidence": number
    }
  ],
  "totalCalories": number,
  "analysis": "description courte du repas et équilibre nutritionnel"
}

Sois réaliste sur les portions visibles. En cas de doute sur la quantité, indique une confiance plus basse.
Ne pas inventer d'aliments non visibles sur la photo.`;

const NUTRITION_COACHING_PROMPT = `Tu es un coach nutritionnel spécialisé dans la nutrition sportive pour coureurs.

Analyse les données nutritionnelles et d'entraînement fournies et donne un coaching complet :

1. **Balance énergétique** : Adéquation apports vs dépenses, impact sur la composition corporelle
2. **Répartition des macros** : Équilibre protéines/glucides/lipides, adéquation pour un coureur
3. **Timing nutritionnel** : Répartition des repas dans la journée, nutrition péri-entraînement
4. **Hydratation** : Estimation basée sur les repas (si pertinent)
5. **Points forts** : Ce qui est bien fait
6. **Axes d'amélioration** : Recommandations concrètes et actionnables avec quantités
7. **Impact performance** : Lien entre nutrition et performances de course

Contextualise par rapport au profil coureur (VO2max, charge d'entraînement) si disponible.
Sois précis et donne des recommandations chiffrées.
Réponds en français.`;

// ==========================================
// ANALYSE PHOTO
// ==========================================

/**
 * Analyse une photo de repas avec Gemini Vision
 */
export async function analyzePhoto(
  imageBase64: string,
  mimeType: string,
  userHint?: string
): Promise<PhotoAnalysisResult | { error: string }> {
  try {
    const ai = getAI();

    const prompt = userHint
      ? `${PHOTO_ANALYSIS_PROMPT}\n\nPrécisions de l'utilisateur sur ce repas : "${userHint}". Utilise ces informations pour affiner ton analyse (type d'aliment, ingrédients, préparation, etc.).`
      : PHOTO_ANALYSIS_PROMPT;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const text = response.text ?? "{}";
    const raw = JSON.parse(text);

    // Multiplier par numberOfItems si présent
    const result: PhotoAnalysisResult = {
      analysis: raw.analysis ?? "",
      totalCalories: 0,
      foods: (raw.foods ?? []).map((f: Record<string, unknown>) => {
        const n = (f.numberOfItems as number) ?? 1;
        const food = {
          name: n > 1 ? `${f.name} (x${n})` : (f.name as string),
          quantity: ((f.quantity as number) ?? 0) * n,
          unit: (f.unit as string) ?? "g",
          calories: Math.round(((f.calories as number) ?? 0) * n),
          protein: Math.round(((f.protein as number) ?? 0) * n),
          carbs: Math.round(((f.carbs as number) ?? 0) * n),
          fat: Math.round(((f.fat as number) ?? 0) * n),
          confidence: (f.confidence as number) ?? 80,
        };
        return food;
      }),
    };
    result.totalCalories = result.foods.reduce((s, f) => s + f.calories, 0);

    return result;
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return { error: "Erreur lors de l'analyse de la photo" };
  }
}

/**
 * Sauvegarde une photo avec les aliments détectés dans un repas existant
 */
export async function savePhotoToMeal(
  mealId: string,
  imageBase64: string,
  mimeType: string,
  foods: FoodInput[]
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();

  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: user.id },
  });

  if (!meal) {
    return { success: false, error: "Repas non trouvé" };
  }

  try {
    // Sauvegarder la photo
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        imageData: imageBase64,
        imageMimeType: mimeType,
      },
    });

    // Ajouter les aliments détectés
    if (foods.length > 0) {
      await prisma.food.createMany({
        data: foods.map((f) => ({
          mealId,
          name: f.name,
          quantity: f.quantity,
          unit: f.unit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          source: "ai_vision",
          confidence: f.confidence ?? null,
        })),
      });

      // Recalculer les totaux
      const totals = foods.reduce(
        (acc, f) => ({
          totalCalories: acc.totalCalories + f.calories,
          totalProtein: acc.totalProtein + f.protein,
          totalCarbs: acc.totalCarbs + f.carbs,
          totalFat: acc.totalFat + f.fat,
        }),
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
      );

      await prisma.meal.update({
        where: { id: mealId },
        data: totals,
      });
    }

    revalidatePath("/nutrition");
    return { success: true };
  } catch (error) {
    console.error("Error saving photo to meal:", error);
    return { success: false, error: "Erreur lors de la sauvegarde" };
  }
}

/**
 * Crée un nouveau repas à partir d'une photo analysée
 */
export async function createMealFromPhoto(
  dateStr: string,
  mealType: MealType,
  imageBase64: string,
  mimeType: string,
  foods: FoodInput[],
  name?: string
): Promise<{ mealId: string } | { error: string }> {
  const user = await getAuthenticatedUser();

  try {
    // Calculer les totaux
    const totals = foods.reduce(
      (acc, f) => ({
        totalCalories: acc.totalCalories + f.calories,
        totalProtein: acc.totalProtein + f.protein,
        totalCarbs: acc.totalCarbs + f.carbs,
        totalFat: acc.totalFat + f.fat,
      }),
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
    );

    // Chercher un repas existant du même type pour cette date
    const existing = await prisma.meal.findFirst({
      where: {
        userId: user.id,
        date: new Date(dateStr),
        mealType,
      },
    });

    let mealId: string;

    if (existing) {
      mealId = existing.id;
    } else {
      const meal = await prisma.meal.create({
        data: {
          userId: user.id,
          date: new Date(dateStr),
          mealType,
          name: name ?? null,
          imageData: imageBase64,
          imageMimeType: mimeType,
          ...totals,
        },
      });
      mealId = meal.id;
    }

    // Ajouter les aliments avec la photo associée
    if (foods.length > 0) {
      await prisma.food.createMany({
        data: foods.map((f) => ({
          mealId,
          name: f.name,
          quantity: f.quantity,
          unit: f.unit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          source: "ai_vision",
          confidence: f.confidence ?? null,
          imageData: imageBase64,
          imageMimeType: mimeType,
        })),
      });
    }

    // Recalculer les totaux du repas fusionné
    await updateMealTotals(mealId);

    revalidatePath("/nutrition");
    return { mealId };
  } catch (error) {
    console.error("Error creating meal from photo:", error);
    return { error: "Erreur lors de la création du repas" };
  }
}

// ==========================================
// COACHING IA
// ==========================================

/**
 * Génère une analyse coaching nutritionnel
 */
export async function generateNutritionCoaching(
  period: "daily" | "weekly"
): Promise<{ analysis: string } | { error: string }> {
  try {
    const user = await getAuthenticatedUser();
    const ai = getAI();

    // Récupérer les données
    const days = period === "daily" ? 1 : 7;
    const history = await fetchNutritionHistory(days);
    const goal = await fetchNutritionGoal();

    // Récupérer les activités récentes pour le contexte
    const since = new Date();
    since.setDate(since.getDate() - days);

    const activities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        startTimeLocal: { gte: since },
      },
      select: {
        activityName: true,
        distance: true,
        duration: true,
        calories: true,
        averageHR: true,
        aerobicTrainingEffect: true,
      },
    });

    // Construire le contexte
    const context = {
      period,
      user: {
        weight: user.weight,
        height: user.height,
        vo2max: user.vo2max,
      },
      goal: goal
        ? {
            bmr: goal.bmr,
            tdee: goal.tdee,
            targetCalories: goal.targetCalories,
            targetProtein: goal.targetProtein,
            targetCarbs: goal.targetCarbs,
            targetFat: goal.targetFat,
            weeklyWeightGoal: goal.weeklyWeightGoal,
          }
        : null,
      nutrition: history,
      activities: activities.map((a) => ({
        name: a.activityName,
        distance: a.distance,
        duration: a.duration,
        calories: a.calories,
        avgHR: a.averageHR,
        trainingEffect: a.aerobicTrainingEffect,
      })),
    };

    const prompt = `${NUTRITION_COACHING_PROMPT}

Données à analyser :
${JSON.stringify(context, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        systemInstruction: NUTRITION_COACHING_PROMPT,
        temperature: 0.5,
      },
    });

    const analysis = response.text ?? "";

    // Sauvegarder en cache
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - days);

    await prisma.nutritionAnalysis.upsert({
      where: {
        userId_analysisType: {
          userId: user.id,
          analysisType: period,
        },
      },
      update: {
        analysis,
        periodStart,
        periodEnd: now,
      },
      create: {
        userId: user.id,
        analysisType: period,
        analysis,
        periodStart,
        periodEnd: now,
      },
    });

    revalidatePath("/nutrition");
    return { analysis };
  } catch (error) {
    console.error("Error generating nutrition coaching:", error);
    return { error: "Erreur lors de la génération de l'analyse" };
  }
}

/**
 * Récupère l'analyse coaching en cache
 */
export async function fetchNutritionCoaching(
  period: "daily" | "weekly"
): Promise<{ analysis: string; createdAt: Date } | null> {
  const user = await getAuthenticatedUser();

  const cached = await prisma.nutritionAnalysis.findUnique({
    where: {
      userId_analysisType: {
        userId: user.id,
        analysisType: period,
      },
    },
  });

  if (!cached) return null;

  return {
    analysis: cached.analysis,
    createdAt: cached.createdAt,
  };
}

/**
 * Génère une analyse IA pour un repas spécifique
 */
export async function analyzeMeal(
  mealId: string
): Promise<{ analysis: string } | { error: string }> {
  const user = await getAuthenticatedUser();

  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: user.id },
    include: { foods: true, analysis: true },
  });

  if (!meal) {
    return { error: "Repas non trouvé" };
  }

  // Si analyse déjà en cache, la retourner
  if (meal.analysis) {
    return { analysis: meal.analysis.analysis };
  }

  try {
    const ai = getAI();

    const mealData = {
      mealType: meal.mealType,
      totalCalories: meal.totalCalories,
      totalProtein: meal.totalProtein,
      totalCarbs: meal.totalCarbs,
      totalFat: meal.totalFat,
      foods: meal.foods.map((f) => ({
        name: f.name,
        quantity: f.quantity,
        unit: f.unit,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      })),
    };

    const prompt = `Analyse ce repas et donne des conseils nutritionnels :

${JSON.stringify(mealData, null, 2)}

Fournis :
1. Équilibre du repas (macros)
2. Points positifs
3. Suggestions d'amélioration
4. Alternatives plus saines si pertinent

Réponds en français, de manière concise.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    const analysis = response.text ?? "";

    // Sauvegarder en cache
    await prisma.mealAnalysis.create({
      data: {
        mealId,
        analysis,
      },
    });

    revalidatePath("/nutrition");
    return { analysis };
  } catch (error) {
    console.error("Error analyzing meal:", error);
    return { error: "Erreur lors de l'analyse" };
  }
}
