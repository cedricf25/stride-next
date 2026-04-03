import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp, Scale } from "lucide-react";
import { fetchNutritionHistory, fetchWeeklyBalance } from "@/actions/nutrition";
import { PageContainer, Card } from "@/components/shared";
import CalorieHistoryChart from "@/components/nutrition/CalorieHistoryChart";

export const dynamic = "force-dynamic";

export default async function NutritionHistoryPage() {
  const [history, weeklyBalance] = await Promise.all([
    fetchNutritionHistory(30),
    fetchWeeklyBalance(),
  ]);

  // Calculer les stats
  const validDays = history.filter((d) => d.mealsCount > 0);
  const avgIntake =
    validDays.length > 0
      ? Math.round(
          validDays.reduce((sum, d) => sum + d.intake, 0) / validDays.length
        )
      : 0;
  const avgExpenditure =
    validDays.length > 0
      ? Math.round(
          validDays.reduce((sum, d) => sum + d.expenditure, 0) / validDays.length
        )
      : 0;
  const totalBalance = history.reduce((sum, d) => sum + d.balance, 0);

  // Estimation perte/gain de poids (7700 kcal = 1 kg)
  const estimatedWeightChange = totalBalance / 7700;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/nutrition"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <h1 className="text-xl font-bold text-[var(--text-primary)] md:text-2xl">
          Historique nutritionnel
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Suivi de tes calories sur les 30 derniers jours
        </p>
      </div>

      {/* Stats semaine */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <Card padding="md">
          <p className="text-sm text-[var(--text-muted)]">Cette semaine</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {weeklyBalance.totalIntake.toLocaleString()} kcal
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            consommés ({weeklyBalance.daysLogged} jours)
          </p>
        </Card>

        <Card padding="md">
          <p className="text-sm text-[var(--text-muted)]">Dépensé</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {weeklyBalance.totalExpenditure.toLocaleString()} kcal
          </p>
          <p className="text-xs text-[var(--text-muted)]">BMR + activités</p>
        </Card>

        <Card padding="md">
          <p className="text-sm text-[var(--text-muted)]">Balance semaine</p>
          <p
            className={`text-xl font-bold ${
              weeklyBalance.balance > 0
                ? "text-orange-600 dark:text-orange-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {weeklyBalance.balance > 0 ? "+" : ""}
            {weeklyBalance.balance.toLocaleString()} kcal
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {weeklyBalance.balance > 0 ? "surplus" : "déficit"}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-sm text-[var(--text-muted)]">Tendance poids</p>
          <div className="flex items-center gap-2">
            {estimatedWeightChange > 0 ? (
              <TrendingUp className="h-5 w-5 text-orange-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
            <p
              className={`text-xl font-bold ${
                estimatedWeightChange > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {estimatedWeightChange > 0 ? "+" : ""}
              {estimatedWeightChange.toFixed(2)} kg
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">sur 30 jours</p>
        </Card>
      </div>

      {/* Graphique */}
      <CalorieHistoryChart data={history} />

      {/* Moyennes */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Scale className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                Moyenne consommé/jour
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {avgIntake.toLocaleString()} kcal
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Scale className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                Moyenne dépensé/jour
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {avgExpenditure.toLocaleString()} kcal
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info */}
      <p className="mt-6 text-xs text-[var(--text-muted)] text-center">
        Les dépenses incluent ton métabolisme de base (BMR) + les calories
        brûlées par les activités Garmin.
      </p>
    </PageContainer>
  );
}
