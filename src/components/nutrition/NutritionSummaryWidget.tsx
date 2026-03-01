import Link from "next/link";
import { Utensils, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { Card, ProgressBar } from "@/components/shared";
import type { DailyNutrition } from "@/types/nutrition";

interface NutritionSummaryWidgetProps {
  data: DailyNutrition | null;
}

export default function NutritionSummaryWidget({
  data,
}: NutritionSummaryWidgetProps) {
  if (!data || data.meals.length === 0) {
    return (
      <Link href="/nutrition">
        <Card
          padding="md"
          hover
          className="h-full flex flex-col justify-center items-center text-center"
        >
          <Utensils className="h-8 w-8 text-[var(--text-muted)] mb-2" />
          <h3 className="font-medium text-[var(--text-primary)]">Nutrition</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Aucun repas enregistré aujourd&apos;hui
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400">
            <span>Ajouter un repas</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Card>
      </Link>
    );
  }

  const { totals, goal, balance } = data;
  const targetCalories = goal?.targetCalories ?? 2000;
  const caloriesPercent = Math.min(
    100,
    (totals.calories / targetCalories) * 100
  );

  return (
    <Link href="/nutrition">
      <Card padding="md" hover className="h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-[var(--text-primary)]">
              Nutrition
            </h3>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
        </div>

        {/* Calories */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {totals.calories}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              / {targetCalories} kcal
            </span>
          </div>
          <ProgressBar
            value={caloriesPercent}
            color={caloriesPercent > 100 ? "bg-red-500" : "bg-orange-500"}
            className="h-2"
          />
        </div>

        {/* Macros compacts */}
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-3">
          <span>P: {totals.protein.toFixed(0)}g</span>
          <span>G: {totals.carbs.toFixed(0)}g</span>
          <span>L: {totals.fat.toFixed(0)}g</span>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
          <span className="text-sm text-[var(--text-muted)]">Balance</span>
          <div
            className={`flex items-center gap-1 font-medium ${
              balance > 0
                ? "text-orange-600 dark:text-orange-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {balance > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {balance > 0 ? "+" : ""}
              {balance} kcal
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
