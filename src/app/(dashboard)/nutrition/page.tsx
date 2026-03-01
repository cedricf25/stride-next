import Link from "next/link";
import { Plus, Camera, Settings, History, Heart } from "lucide-react";
import { fetchDailyNutrition } from "@/actions/nutrition";
import { DailyNutritionHeader, MealCard } from "@/components/nutrition";
import { PageContainer, SectionHeader, Button, EmptyState } from "@/components/shared";

export const dynamic = "force-dynamic";

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default async function NutritionPage() {
  const todayStr = getTodayDateString();
  const data = await fetchDailyNutrition(todayStr);

  const todayFormatted = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] md:text-2xl">
            Nutrition
          </h1>
          <p className="text-sm text-[var(--text-muted)] capitalize">
            {todayFormatted}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/nutrition/add/photo">
            <Button variant="ghost-primary" size="sm">
              <Camera className="h-4 w-4 mr-1.5" />
              Photo
            </Button>
          </Link>
          <Link href="/nutrition/add">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation secondaire */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/nutrition/favorites">
          <Button variant="secondary" size="sm">
            <Heart className="h-4 w-4 mr-1.5" />
            Favoris
          </Button>
        </Link>
        <Link href="/nutrition/history">
          <Button variant="secondary" size="sm">
            <History className="h-4 w-4 mr-1.5" />
            Historique
          </Button>
        </Link>
        <Link href="/nutrition/settings">
          <Button variant="secondary" size="sm">
            <Settings className="h-4 w-4 mr-1.5" />
            Objectifs
          </Button>
        </Link>
      </div>

      {/* Résumé du jour */}
      {data.meals.length > 0 || data.goal ? (
        <div className="mb-6">
          <DailyNutritionHeader data={data} />
        </div>
      ) : null}

      {/* Liste des repas */}
      <SectionHeader
        title="Repas du jour"
        icon={null}
        size="md"
        className="mb-4"
      />

      {data.meals.length > 0 ? (
        <div className="space-y-4">
          {data.meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} editable={false} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucun repas"
          message="Commence par ajouter ton premier repas de la journée"
          icon={<Plus className="h-10 w-10" />}
          variant="dashed"
        >
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link href="/nutrition/add/photo">
              <Button variant="secondary" size="sm">
                <Camera className="h-4 w-4 mr-1.5" />
                Analyser une photo
              </Button>
            </Link>
            <Link href="/nutrition/add">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Ajouter manuellement
              </Button>
            </Link>
          </div>
        </EmptyState>
      )}

      {/* Info objectifs non configurés */}
      {!data.goal && (
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Conseil :</strong> Configure tes objectifs caloriques pour
            suivre ta balance énergétique.
          </p>
          <Link
            href="/nutrition/settings"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Settings className="h-4 w-4" />
            Configurer mes objectifs
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
