import { Timer, Info } from "lucide-react";
import { fetchSavedPredictions } from "@/actions/predictions";
import PredictionCard from "@/components/predictions/PredictionCard";
import RefreshPredictionsButton from "@/components/predictions/RefreshPredictionsButton";
import { PageContainer, EmptyState, AlertBanner } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const result = await fetchSavedPredictions();

  return (
    <PageContainer>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-[var(--text-primary)]">
            <Timer className="h-7 w-7 text-blue-600" />
            Prédictions de course
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Estimations basées sur tes activités récentes, ton VO2max et des
            modèles de prédiction (Riegel, Daniels)
          </p>
        </div>
        <RefreshPredictionsButton />
      </div>

      {!result ? (
        <EmptyState
          variant="dashed"
          icon={<Timer className="h-10 w-10" />}
          message="Aucune prédiction générée"
          subtitle='Clique sur "Générer les prédictions" pour lancer l&apos;analyse IA'
        />
      ) : (
        <>
          <AlertBanner
            variant="info"
            icon={<Info className="h-5 w-5 text-blue-600" />}
            className="mb-6"
          >
            <p className="text-sm leading-relaxed text-blue-800">
              {result.summary}
            </p>
            <p className="mt-1 text-xs text-blue-500">
              Généré le{" "}
              {new Date(result.generatedAt).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </AlertBanner>

          {/* Predictions grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.predictions.map((prediction) => (
              <PredictionCard
                key={prediction.distance}
                prediction={prediction}
              />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
