import { Timer, Info } from "lucide-react";
import { fetchSavedPredictions } from "@/actions/predictions";
import PredictionCard from "@/components/predictions/PredictionCard";
import RefreshPredictionsButton from "@/components/predictions/RefreshPredictionsButton";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const result = await fetchSavedPredictions();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <Timer className="h-7 w-7 text-blue-600" />
            Prédictions de course
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Estimations basées sur tes activités récentes, ton VO2max et des
            modèles de prédiction (Riegel, Daniels)
          </p>
        </div>
        <RefreshPredictionsButton />
      </div>

      {!result ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Timer className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="text-gray-500">Aucune prédiction générée</p>
          <p className="mt-1 text-sm text-gray-400">
            Clique sur &ldquo;Générer les prédictions&rdquo; pour lancer
            l&apos;analyse IA
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
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
            </div>
          </div>

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
    </div>
  );
}
