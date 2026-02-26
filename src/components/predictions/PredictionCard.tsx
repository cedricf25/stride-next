"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Target, Heart, TrendingUp, TrendingDown } from "lucide-react";
import type { EnrichedPrediction, PersonalBest } from "@/types/predictions";
import { Card, ProgressBar, Badge } from "@/components/shared";

const distanceIcons: Record<string, string> = {
  "5km": "5K",
  "10km": "10K",
  "semi-marathon": "21K",
  "marathon": "42K",
  "trail": "50K",
};

function confidenceBadgeColor(confidence: number): "green" | "orange" | "red" {
  if (confidence >= 70) return "green";
  if (confidence >= 40) return "orange";
  return "red";
}

function confidenceBarColor(confidence: number) {
  if (confidence >= 70) return "bg-green-500";
  if (confidence >= 40) return "bg-orange-500";
  return "bg-red-500";
}

// Parse un temps en secondes (mm:ss ou h:mm:ss)
function parseTime(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Formate une différence de temps
function formatTimeDiff(diffSeconds: number): string {
  const absSeconds = Math.abs(diffSeconds);
  if (absSeconds < 60) {
    return `${diffSeconds > 0 ? "+" : "-"}${absSeconds}s`;
  }
  const min = Math.floor(absSeconds / 60);
  const sec = absSeconds % 60;
  const sign = diffSeconds > 0 ? "+" : "-";
  return sec > 0 ? `${sign}${min}m${sec}s` : `${sign}${min}m`;
}

interface PredictionCardProps {
  prediction: EnrichedPrediction;
  personalBest?: PersonalBest;
}

export default function PredictionCard({
  prediction,
  personalBest,
}: PredictionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const badge = distanceIcons[prediction.distance] ?? prediction.distance;

  // Calculer la différence avec le record personnel
  let diffWithPB: number | null = null;
  if (personalBest) {
    const predictedSeconds = parseTime(prediction.predictedTime);
    const pbSeconds = parseTime(personalBest.time);
    diffWithPB = predictedSeconds - pbSeconds;
  }

  const hasDetails =
    prediction.estimatedSplits ||
    prediction.raceStrategy ||
    prediction.heartRateZones;

  return (
    <Card padding="md" hover>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            {badge}
          </span>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {prediction.label}
            </h3>
            <p className="text-sm text-[var(--text-tertiary)]">
              {prediction.predictedPace}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {prediction.predictedTime}
          </p>
          {diffWithPB !== null && (
            <div
              className={`mt-1 flex items-center justify-end gap-1 text-xs ${diffWithPB > 0 ? "text-orange-600" : "text-green-600"}`}
            >
              {diffWithPB > 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              <span>{formatTimeDiff(diffWithPB)} vs record</span>
            </div>
          )}
        </div>
      </div>

      {/* Confidence */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-tertiary)]">Fiabilité</span>
          <Badge
            color={confidenceBadgeColor(prediction.confidence)}
            variant="outline"
          >
            {prediction.confidence}%
          </Badge>
        </div>
        <ProgressBar
          value={prediction.confidence}
          color={confidenceBarColor(prediction.confidence)}
          className="mt-1"
        />
      </div>

      {/* Comment */}
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {prediction.comment}
      </p>

      {/* Record personnel */}
      {personalBest && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-[var(--bg-secondary)] p-2 text-xs">
          <Target className="h-4 w-4 text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-tertiary)]">
            Record : {personalBest.time} ({personalBest.pace})
          </span>
        </div>
      )}

      {/* Expand button */}
      {hasDetails && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-md border border-[var(--border-default)] py-2 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Masquer les détails
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Voir les détails
              </>
            )}
          </button>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 space-y-4 border-t border-[var(--border-default)] pt-4">
              {/* Estimated splits */}
              {prediction.estimatedSplits &&
                prediction.estimatedSplits.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                      <TrendingUp className="h-4 w-4" />
                      Splits estimés
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {prediction.estimatedSplits.map((split, i) => (
                        <span
                          key={i}
                          className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          km{i + 1}: {split}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Heart rate zones */}
              {prediction.heartRateZones && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <Heart className="h-4 w-4" />
                    Zones FC par phase
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded bg-green-50 p-2 text-center dark:bg-green-900/30">
                      <div className="font-medium text-green-700 dark:text-green-300">
                        Départ
                      </div>
                      <div className="mt-1 text-green-600 dark:text-green-400">
                        {prediction.heartRateZones.start}
                      </div>
                    </div>
                    <div className="rounded bg-orange-50 p-2 text-center dark:bg-orange-900/30">
                      <div className="font-medium text-orange-700 dark:text-orange-300">
                        Milieu
                      </div>
                      <div className="mt-1 text-orange-600 dark:text-orange-400">
                        {prediction.heartRateZones.middle}
                      </div>
                    </div>
                    <div className="rounded bg-red-50 p-2 text-center dark:bg-red-900/30">
                      <div className="font-medium text-red-700 dark:text-red-300">
                        Fin
                      </div>
                      <div className="mt-1 text-red-600 dark:text-red-400">
                        {prediction.heartRateZones.finish}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Race strategy */}
              {prediction.raceStrategy && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <Target className="h-4 w-4" />
                    Stratégie de course
                  </h4>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {prediction.raceStrategy}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
