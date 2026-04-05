// Types pour la fonctionnalité Nutrition

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodSource = "manual" | "ai_vision" | "favorite";

export type Gender = "male" | "female";

export type NutritionAnalysisType = "daily" | "weekly" | "trends";

// Aliment individuel
export interface FoodInput {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: FoodSource;
  confidence?: number;
}

export interface FoodItem extends FoodInput {
  id: string;
  mealId: string;
  imageData?: string | null;
  imageMimeType?: string | null;
  createdAt: Date;
}

// Repas
export interface CreateMealInput {
  date: string; // YYYY-MM-DD
  mealType: MealType;
  name?: string;
  notes?: string;
}

export interface MealWithFoods {
  id: string;
  userId: string;
  date: Date;
  mealType: MealType;
  name: string | null;
  notes: string | null;
  imageData: string | null;
  imageMimeType: string | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: Date;
  updatedAt: Date;
  foods: FoodItem[];
  hasAnalysis?: boolean;
}

// Totaux nutritionnels
export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Objectif protéines adapté à l'activité du jour
export interface ProteinTarget {
  min: number; // g — seuil minimum (fonte musculaire si en dessous)
  optimal: number; // g — cible optimale
  max: number; // g — plafond recommandé
  isTrainingDay: boolean;
  ratioPerKg: { min: number; optimal: number; max: number }; // g/kg utilisés
}

// Journal quotidien
export interface DailyNutrition {
  date: string;
  meals: MealWithFoods[];
  totals: NutritionTotals;
  goal: NutritionGoalData | null;
  activitiesCalories: number;
  balance: number; // totals.calories - activitiesCalories - bmr
  proteinTarget: ProteinTarget | null;
}

// Objectifs nutritionnels
export interface NutritionGoalInput {
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  weeklyWeightGoal?: number;
}

export interface NutritionGoalData {
  id: string;
  userId: string;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  weeklyWeightGoal: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Métabolisme
export interface MetabolismResult {
  bmr: number;
  tdee: number;
  avgActiveCalories: number;
  daysWithData: number;
}

export interface MetabolismInput {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: Gender;
}

// Historique
export interface NutritionDayHistory {
  date: string;
  intake: number; // calories consommées
  expenditure: number; // calories dépensées (activités + BMR)
  balance: number; // intake - expenditure
  mealsCount: number;
}

// Analyse photo IA
export interface PhotoAnalysisResult {
  foods: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
  }>;
  totalCalories: number;
  analysis: string;
}

// Repas favoris
export interface FavoriteMealData {
  id: string;
  userId: string;
  name: string;
  mealType: MealType;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: FoodInput[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Labels en français
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "☕",
  lunch: "🍽️",
  dinner: "🌙",
  snack: "🍎",
};

// Couleurs pour les macros
export const MACRO_COLORS = {
  protein: "#3b82f6", // blue-500
  carbs: "#22c55e", // green-500
  fat: "#eab308", // yellow-500
  calories: "#f97316", // orange-500
};

// Unités courantes
export const FOOD_UNITS = ["g", "ml", "portion", "pièce", "cuillère", "tasse"];
