"use client";

import { useState } from "react";
import { History, Check, ArrowRight } from "lucide-react";
import type { PredictionBatchSummary } from "@/types/predictions";
import { Card, Badge, SectionHeader } from "@/components/shared";

interface PredictionHistoryListProps {
  batches: PredictionBatchSummary[];
  currentBatchId?: string;
  onCompare?: (batchIdA: string, batchIdB: string) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceColor(confidence: number | null): "green" | "orange" | "red" | "gray" {
  if (confidence === null) return "gray";
  if (confidence >= 70) return "green";
  if (confidence >= 40) return "orange";
  return "red";
}

export default function PredictionHistoryList({
  batches,
  currentBatchId,
  onCompare,
}: PredictionHistoryListProps) {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  const handleSelect = (batchId: string) => {
    if (!onCompare) return;

    setSelectedBatches((prev) => {
      if (prev.includes(batchId)) {
        return prev.filter((id) => id !== batchId);
      }
      if (prev.length >= 2) {
        return [prev[1], batchId];
      }
      return [...prev, batchId];
    });
  };

  const handleCompare = () => {
    if (selectedBatches.length === 2 && onCompare) {
      onCompare(selectedBatches[0], selectedBatches[1]);
    }
  };

  if (batches.length === 0) {
    return null;
  }

  return (
    <Card padding="md">
      <SectionHeader
        icon={<History className="h-5 w-5" />}
        title="Historique"
        size="sm"
      />

      <div className="mt-4 space-y-2">
        {batches.map((batch, index) => {
          const isCurrent = batch.id === currentBatchId;
          const isSelected = selectedBatches.includes(batch.id);

          return (
            <button
              key={batch.id}
              onClick={() => handleSelect(batch.id)}
              disabled={!onCompare}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-[var(--border-default)] hover:bg-[var(--bg-secondary)]"
              } ${!onCompare ? "cursor-default" : ""}`}
            >
              {/* Selection indicator */}
              {onCompare && (
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-[var(--border-default)]"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {formatDate(batch.generatedAt)}
                  </span>
                  {isCurrent && (
                    <Badge color="blue" variant="soft">
                      Actuelle
                    </Badge>
                  )}
                </div>
                <p
                  className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]"
                  title={formatFullDate(batch.generatedAt)}
                >
                  {batch.predictionsCount} prédictions
                </p>
              </div>

              {/* Confidence */}
              <Badge
                color={confidenceColor(batch.avgConfidence)}
                variant="outline"
              >
                {batch.avgConfidence ?? "—"}%
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Compare button */}
      {onCompare && selectedBatches.length === 2 && (
        <button
          onClick={handleCompare}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Comparer
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {onCompare && selectedBatches.length < 2 && batches.length >= 2 && (
        <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
          Sélectionne 2 dates pour comparer
        </p>
      )}
    </Card>
  );
}
