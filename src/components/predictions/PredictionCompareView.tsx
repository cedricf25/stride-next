"use client";

import { X, TrendingUp, TrendingDown, ArrowRight, Minus } from "lucide-react";
import type { PredictionComparison } from "@/types/predictions";
import { Card, Badge } from "@/components/shared";

interface PredictionCompareViewProps {
  comparison: PredictionComparison;
  onClose: () => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Formate une différence de temps en texte lisible
function formatTimeDiff(diffSeconds: number): string {
  const absSeconds = Math.abs(diffSeconds);
  if (absSeconds === 0) return "0s";

  if (absSeconds < 60) {
    return `${absSeconds}s`;
  }

  const min = Math.floor(absSeconds / 60);
  const sec = absSeconds % 60;

  if (min < 60) {
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  }

  const hours = Math.floor(min / 60);
  const mins = min % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function PredictionCompareView({
  comparison,
  onClose,
}: PredictionCompareViewProps) {
  return (
    <Card padding="md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {formatDate(comparison.batchA.generatedAt)}
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {formatDate(comparison.batchB.generatedAt)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Time diffs */}
      <div className="mt-4 space-y-3">
        <h4 className="text-xs font-medium uppercase text-[var(--text-tertiary)]">
          Évolution des temps
        </h4>

        {comparison.diffs.map((diff) => {
          const improved = diff.timeDiffSeconds < 0;
          const regressed = diff.timeDiffSeconds > 0;

          return (
            <div
              key={diff.distance}
              className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
                  {diff.label.replace("Semi-marathon", "21K").replace("Marathon", "42K").replace("Trail 50km", "50K").replace(" km", "K")}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-tertiary)]">
                      {diff.timeBefore}
                    </span>
                    <ArrowRight className="h-3 w-3 text-[var(--text-tertiary)]" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {diff.timeAfter}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    Confiance: {diff.confidenceBefore}% → {diff.confidenceAfter}%
                  </div>
                </div>
              </div>

              {/* Diff indicator */}
              <div
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  improved
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : regressed
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {improved ? (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    <span>-{formatTimeDiff(Math.abs(diff.timeDiffSeconds))}</span>
                  </>
                ) : regressed ? (
                  <>
                    <TrendingDown className="h-3 w-3" />
                    <span>+{formatTimeDiff(diff.timeDiffSeconds)}</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3 w-3" />
                    <span>=</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context changes */}
      {comparison.contextChanges.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-xs font-medium uppercase text-[var(--text-tertiary)]">
            Changements de contexte
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {comparison.contextChanges.map((change) => (
              <div
                key={change.field}
                className="rounded-lg border border-[var(--border-default)] p-2 text-xs"
              >
                <div className="text-[var(--text-tertiary)]">
                  {change.label}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">
                    {change.before ?? "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-[var(--text-tertiary)]" />
                  <span className="font-medium text-[var(--text-primary)]">
                    {change.after ?? "—"}
                  </span>
                  {change.unit && (
                    <span className="text-[var(--text-tertiary)]">
                      {change.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <strong>Résumé :</strong>{" "}
        {comparison.diffs.filter((d) => d.timeDiffSeconds < 0).length > 0 ? (
          <>
            Amélioration sur{" "}
            {comparison.diffs.filter((d) => d.timeDiffSeconds < 0).length}{" "}
            distance(s).
          </>
        ) : comparison.diffs.filter((d) => d.timeDiffSeconds > 0).length > 0 ? (
          <>
            Régression sur{" "}
            {comparison.diffs.filter((d) => d.timeDiffSeconds > 0).length}{" "}
            distance(s).
          </>
        ) : (
          <>Pas de changement significatif.</>
        )}
      </div>
    </Card>
  );
}
