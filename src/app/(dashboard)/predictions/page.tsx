import { Timer } from "lucide-react";
import {
  fetchSavedPredictions,
  fetchPredictionHistory,
  fetchPredictionBatch,
  fetchPersonalBests,
} from "@/actions/predictions";
import { RefreshPredictionsButton, PredictionsClient } from "@/components/predictions";
import { PageContainer } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  // Récupérer toutes les données en parallèle
  const [latestBatch, history, personalBests] = await Promise.all([
    fetchSavedPredictions(),
    fetchPredictionHistory(10),
    fetchPersonalBests(),
  ]);

  // Récupérer les données complètes des batches pour le graphique d'évolution
  const allBatches = await Promise.all(
    history.slice(0, 5).map((h) => fetchPredictionBatch(h.id))
  ).then((results) => results.filter((r): r is NonNullable<typeof r> => r !== null));

  return (
    <PageContainer>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-[var(--text-primary)]">
            <Timer className="h-7 w-7 text-blue-600" />
            Prédictions de course
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Estimations basées sur tes activités, récupération et des modèles de
            prédiction (Riegel, Daniels)
          </p>
        </div>
        <RefreshPredictionsButton />
      </div>

      <PredictionsClient
        latestBatch={latestBatch}
        history={history}
        allBatches={allBatches}
        personalBests={personalBests}
      />
    </PageContainer>
  );
}
