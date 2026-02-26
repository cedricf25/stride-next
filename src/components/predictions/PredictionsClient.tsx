"use client";

import { useState, useTransition } from "react";
import { Timer, Info, Lightbulb, AlertTriangle } from "lucide-react";
import type { PredictionsResult, PredictionBatchSummary, PersonalBest, PredictionComparison } from "@/types/predictions";
import { comparePredictionBatches } from "@/actions/predictions";
import {
  PredictionCard,
  PredictionHistoryList,
  PredictionEvolutionChart,
  PredictionCompareView,
} from "@/components/predictions";
import { Card, AlertBanner, SectionHeader, EmptyState } from "@/components/shared";

interface PredictionsClientProps {
  latestBatch: PredictionsResult | null;
  history: PredictionBatchSummary[];
  allBatches: PredictionsResult[];
  personalBests: Record<string, PersonalBest>;
}

export default function PredictionsClient({
  latestBatch,
  history,
  allBatches,
  personalBests,
}: PredictionsClientProps) {
  const [comparison, setComparison] = useState<PredictionComparison | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCompare = (batchIdA: string, batchIdB: string) => {
    startTransition(async () => {
      const result = await comparePredictionBatches(batchIdA, batchIdB);
      setComparison(result);
    });
  };

  if (!latestBatch) {
    return (
      <EmptyState
        variant="dashed"
        icon={<Timer className="h-10 w-10" />}
        message="Aucune prédiction générée"
        subtitle='Clique sur "Générer les prédictions" pour lancer l&apos;analyse IA'
      />
    );
  }

  return (
    <>
      {/* Summary banner */}
      <AlertBanner
        variant="info"
        icon={<Info className="h-5 w-5 text-blue-600" />}
        className="mb-6"
      >
        <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
          {latestBatch.summary}
        </p>
        <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
          Généré le{" "}
          {new Date(latestBatch.generatedAt).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </AlertBanner>

      {/* Recovery impact */}
      {latestBatch.recoveryImpact && (
        <AlertBanner
          variant="warning"
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          className="mb-6"
        >
          <p className="text-sm leading-relaxed text-orange-800 dark:text-orange-200">
            <strong>Impact récupération :</strong> {latestBatch.recoveryImpact}
          </p>
        </AlertBanner>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: predictions + recommendations */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recommendations */}
          {latestBatch.recommendations && (
            <Card padding="md">
              <SectionHeader
                icon={<Lightbulb className="h-5 w-5" />}
                title="Recommandations"
                size="sm"
              />
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {latestBatch.recommendations}
              </p>
            </Card>
          )}

          {/* Predictions grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {latestBatch.predictions.map((prediction) => (
              <PredictionCard
                key={prediction.distance}
                prediction={prediction}
                personalBest={personalBests[prediction.distance]}
              />
            ))}
          </div>
        </div>

        {/* Right column: evolution + history */}
        <div className="space-y-6">
          {/* Evolution chart */}
          {allBatches.length >= 2 && (
            <PredictionEvolutionChart batches={allBatches} />
          )}

          {/* History list */}
          {history.length > 0 && (
            <PredictionHistoryList
              batches={history}
              currentBatchId={latestBatch.id}
              onCompare={history.length >= 2 ? handleCompare : undefined}
            />
          )}

          {/* Compare view */}
          {comparison && (
            <PredictionCompareView
              comparison={comparison}
              onClose={() => setComparison(null)}
            />
          )}

          {/* Loading state */}
          {isPending && (
            <Card padding="md">
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="ml-2 text-sm text-[var(--text-tertiary)]">
                  Comparaison en cours...
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
