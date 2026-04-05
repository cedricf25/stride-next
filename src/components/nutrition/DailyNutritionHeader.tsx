import { Flame, Target, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { Card } from "@/components/shared";
import MacrosPieChart from "./MacrosPieChart";
import ProteinGauge from "./ProteinGauge";
import type { DailyNutrition } from "@/types/nutrition";

interface DailyNutritionHeaderProps {
  data: DailyNutrition;
}

export default function DailyNutritionHeader({
  data,
}: DailyNutritionHeaderProps) {
  const { totals, goal, activitiesCalories, balance, proteinTarget } = data;

  const targetCalories = goal?.targetCalories ?? 2000;
  const remaining = targetCalories - totals.calories;
  const isOver = totals.calories > targetCalories;

  // Pour la barre : si surplus, on scale pour montrer le dépassement
  // Ex: 1460/1200 → la barre objectif s'arrête à ~82%, la barre totale va à 100%
  const scaleMax = isOver ? totals.calories : targetCalories;
  const targetPct = (targetCalories / scaleMax) * 100;
  const filledPct = (totals.calories / scaleMax) * 100;

  // Calcul du bilan énergétique
  const bmr = goal?.bmr ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calories du jour */}
      <Card padding="md" className="lg:col-span-2">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Jauge principale */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-[var(--text-primary)]">
                  Calories
                </span>
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                {totals.calories} / {targetCalories} kcal
              </span>
            </div>

            {/* Barre calories avec visualisation du surplus */}
            <div className="relative h-3 w-full rounded-full bg-[var(--bg-muted)]">
              {/* Portion dans l'objectif (vert) */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-green-500"
                style={{ width: `${isOver ? targetPct : filledPct}%` }}
              />
              {/* Portion en surplus (rouge) */}
              {isOver && (
                <div
                  className="absolute inset-y-0 rounded-r-full bg-red-500"
                  style={{ left: `${targetPct}%`, width: `${filledPct - targetPct}%` }}
                />
              )}
              {/* Marqueur objectif quand en surplus */}
              {isOver && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-white dark:bg-gray-800 z-10"
                  style={{ left: `${targetPct}%` }}
                />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">
                  {remaining > 0
                    ? `${remaining} kcal restantes`
                    : `${Math.abs(remaining)} kcal en surplus`}
                </span>
              </div>

              {goal?.weeklyWeightGoal && (
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  {goal.weeklyWeightGoal < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  )}
                  <span>
                    Objectif : {goal.weeklyWeightGoal > 0 ? "+" : ""}
                    {goal.weeklyWeightGoal} kg/sem
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Macros barres */}
          {goal?.targetProtein && goal?.targetCarbs && goal?.targetFat ? (
            <div className="flex-1 space-y-2">
              {[
                { label: "Protéines", value: totals.protein, goal: goal.targetProtein, color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
                { label: "Glucides", value: totals.carbs, goal: goal.targetCarbs, color: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
                { label: "Lipides", value: totals.fat, goal: goal.targetFat, color: "bg-yellow-500", textColor: "text-yellow-600 dark:text-yellow-400" },
              ].map((macro) => {
                const pct = (macro.value / macro.goal) * 100;
                const over = macro.value > macro.goal;
                const barTarget = over ? (macro.goal / macro.value) * 100 : pct;
                return (
                  <div key={macro.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {macro.label}
                      </span>
                      <span className={`text-xs font-semibold ${over ? "text-red-600 dark:text-red-400" : macro.textColor}`}>
                        {macro.value.toFixed(0)}g / {macro.goal}g
                      </span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-[var(--bg-muted)]">
                      {over ? (
                        <>
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${macro.color}`}
                            style={{ width: `${barTarget}%` }}
                          />
                          <div
                            className="absolute inset-y-0 rounded-r-full bg-red-500"
                            style={{ left: `${barTarget}%`, width: `${100 - barTarget}%` }}
                          />
                          <div
                            className="absolute inset-y-0 w-0.5 bg-white dark:bg-gray-800 z-10"
                            style={{ left: `${barTarget}%` }}
                          />
                        </>
                      ) : (
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${macro.color}`}
                          style={{ width: `${Math.min(barTarget, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-center">
              <MacrosPieChart
                protein={totals.protein}
                carbs={totals.carbs}
                fat={totals.fat}
                size={100}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Balance énergétique */}
      <Card padding="md">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">
          Balance énergétique
        </h3>

        <div className="space-y-3">
          {/* Entrées */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[var(--text-secondary)]">Consommé</span>
            </div>
            <span className="font-medium text-green-600 dark:text-green-400">
              +{totals.calories} kcal
            </span>
          </div>

          {/* BMR */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-[var(--text-secondary)]">
                Métabolisme (BMR)
              </span>
            </div>
            <span className="font-medium text-[var(--text-muted)]">
              -{bmr} kcal
            </span>
          </div>

          {/* Activités */}
          {activitiesCalories > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-3 w-3 text-blue-500" />
                <span className="text-[var(--text-secondary)]">Activités</span>
              </div>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                -{activitiesCalories} kcal
              </span>
            </div>
          )}

          {/* Séparateur */}
          <div className="border-t border-[var(--border-default)] pt-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-primary)]">
                Balance
              </span>
              <span
                className={`font-bold text-lg ${
                  balance > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : balance < -500
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                }`}
              >
                {balance > 0 ? "+" : ""}
                {balance} kcal
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {balance > 0
                ? "Surplus calorique (prise de poids)"
                : balance < -500
                  ? "Déficit important"
                  : "Déficit modéré (perte de poids)"}
            </p>
          </div>
        </div>
      </Card>
      {/* Réglette protéines */}
      {proteinTarget && (
        <Card padding="md" className="lg:col-span-3">
          <ProteinGauge consumed={totals.protein} target={proteinTarget} />
        </Card>
      )}
    </div>
  );
}
