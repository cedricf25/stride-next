"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type {
  PredictionContextSnapshot,
  EnrichedPrediction,
  PredictionBatchSummary,
  PredictionsResult,
  PredictionComparison,
  PredictionDiff,
  ContextChange,
  PersonalBest,
} from "@/types/predictions";

// Helper pour calculer la moyenne d'un tableau de valeurs nullable
export function average(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Helper pour formater une allure en mm:ss /km
export function formatPace(speedMs: number): string {
  if (speedMs <= 0) return "N/A";
  const secPerKm = 1000 / speedMs;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")} /km`;
}

// Helper pour parser un temps "mm:ss" ou "h:mm:ss" en secondes
function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/** Charge le dernier batch de prédictions depuis la DB */
export async function fetchSavedPredictions(): Promise<PredictionsResult | null> {
  const user = await getAuthenticatedUser();

  const batch = await prisma.racePredictionBatch.findFirst({
    where: { userId: user.id },
    orderBy: { generatedAt: "desc" },
    include: { predictions: true },
  });

  if (!batch) return null;

  let contextSnapshot: PredictionContextSnapshot | null = null;
  try {
    contextSnapshot = JSON.parse(batch.contextSnapshot);
  } catch {
    // Ignore parsing errors
  }

  return {
    id: batch.id,
    predictions: batch.predictions.map((p) => ({
      distance: p.distance,
      label: p.label,
      predictedTime: p.predictedTime,
      predictedPace: p.predictedPace,
      confidence: p.confidence,
      comment: p.comment,
      estimatedSplits: p.estimatedSplits ? JSON.parse(p.estimatedSplits) : null,
      raceStrategy: p.raceStrategy,
      heartRateZones: p.heartRateZones ? JSON.parse(p.heartRateZones) : null,
    })),
    summary: batch.summary,
    recoveryImpact: batch.recoveryImpact,
    recommendations: batch.recommendations,
    generatedAt: batch.generatedAt,
    contextSnapshot,
  };
}

/** Récupère l'historique des batches de prédictions */
export async function fetchPredictionHistory(
  limit: number = 10
): Promise<PredictionBatchSummary[]> {
  const user = await getAuthenticatedUser();

  const batches = await prisma.racePredictionBatch.findMany({
    where: { userId: user.id },
    orderBy: { generatedAt: "desc" },
    take: limit,
    include: { _count: { select: { predictions: true } } },
  });

  return batches.map((b) => ({
    id: b.id,
    generatedAt: b.generatedAt,
    summary: b.summary,
    avgConfidence: b.avgConfidence,
    predictionsCount: b._count.predictions,
  }));
}

/** Charge un batch spécifique avec ses prédictions */
export async function fetchPredictionBatch(
  batchId: string
): Promise<PredictionsResult | null> {
  const user = await getAuthenticatedUser();

  const batch = await prisma.racePredictionBatch.findFirst({
    where: { id: batchId, userId: user.id },
    include: { predictions: true },
  });

  if (!batch) return null;

  let contextSnapshot: PredictionContextSnapshot | null = null;
  try {
    contextSnapshot = JSON.parse(batch.contextSnapshot);
  } catch {
    // Ignore parsing errors
  }

  return {
    id: batch.id,
    predictions: batch.predictions.map((p) => ({
      distance: p.distance,
      label: p.label,
      predictedTime: p.predictedTime,
      predictedPace: p.predictedPace,
      confidence: p.confidence,
      comment: p.comment,
      estimatedSplits: p.estimatedSplits ? JSON.parse(p.estimatedSplits) : null,
      raceStrategy: p.raceStrategy,
      heartRateZones: p.heartRateZones ? JSON.parse(p.heartRateZones) : null,
    })),
    summary: batch.summary,
    recoveryImpact: batch.recoveryImpact,
    recommendations: batch.recommendations,
    generatedAt: batch.generatedAt,
    contextSnapshot,
  };
}

/** Compare deux batches de prédictions */
export async function comparePredictionBatches(
  batchIdA: string,
  batchIdB: string
): Promise<PredictionComparison | null> {
  const user = await getAuthenticatedUser();

  const [batchA, batchB] = await Promise.all([
    prisma.racePredictionBatch.findFirst({
      where: { id: batchIdA, userId: user.id },
      include: { predictions: true, _count: { select: { predictions: true } } },
    }),
    prisma.racePredictionBatch.findFirst({
      where: { id: batchIdB, userId: user.id },
      include: { predictions: true, _count: { select: { predictions: true } } },
    }),
  ]);

  if (!batchA || !batchB) return null;

  // Calculer les diffs de prédictions
  const diffs: PredictionDiff[] = [];
  for (const predA of batchA.predictions) {
    const predB = batchB.predictions.find((p) => p.distance === predA.distance);
    if (predB) {
      const timeA = parseTimeToSeconds(predA.predictedTime);
      const timeB = parseTimeToSeconds(predB.predictedTime);
      diffs.push({
        distance: predA.distance,
        label: predA.label,
        timeBefore: predA.predictedTime,
        timeAfter: predB.predictedTime,
        timeDiffSeconds: timeB - timeA,
        confidenceBefore: predA.confidence,
        confidenceAfter: predB.confidence,
      });
    }
  }

  // Calculer les changements de contexte
  const contextChanges: ContextChange[] = [];
  try {
    const ctxA: PredictionContextSnapshot = JSON.parse(batchA.contextSnapshot);
    const ctxB: PredictionContextSnapshot = JSON.parse(batchB.contextSnapshot);

    const fields: Array<{
      key: keyof PredictionContextSnapshot;
      label: string;
      unit?: string;
    }> = [
      { key: "vo2max", label: "VO2max", unit: "ml/kg/min" },
      { key: "weight", label: "Poids", unit: "kg" },
      { key: "weeklyVolume4w", label: "Volume hebdo (4s)", unit: "km" },
      { key: "cumulativeTSS28d", label: "TSS cumulé (28j)" },
      { key: "avgHRV7d", label: "HRV moyen (7j)", unit: "ms" },
      { key: "avgSleepScore7d", label: "Score sommeil (7j)", unit: "/100" },
      { key: "avgBodyBattery7d", label: "Body Battery (7j)", unit: "/100" },
      { key: "avgStressLevel7d", label: "Stress moyen (7j)", unit: "/100" },
    ];

    for (const { key, label, unit } of fields) {
      const valA = ctxA[key];
      const valB = ctxB[key];
      if (valA !== valB && (valA != null || valB != null)) {
        contextChanges.push({
          field: key,
          label,
          before: valA as string | number | null,
          after: valB as string | number | null,
          unit,
        });
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return {
    batchA: {
      id: batchA.id,
      generatedAt: batchA.generatedAt,
      summary: batchA.summary,
      avgConfidence: batchA.avgConfidence,
      predictionsCount: batchA._count.predictions,
    },
    batchB: {
      id: batchB.id,
      generatedAt: batchB.generatedAt,
      summary: batchB.summary,
      avgConfidence: batchB.avgConfidence,
      predictionsCount: batchB._count.predictions,
    },
    diffs,
    contextChanges,
  };
}

/** Récupère les records personnels par distance */
export async function fetchPersonalBests(): Promise<
  Record<string, PersonalBest>
> {
  const user = await getAuthenticatedUser();

  const distanceRanges = [
    { key: "5km", min: 4800, max: 5500 },
    { key: "10km", min: 9500, max: 11000 },
    { key: "semi-marathon", min: 20000, max: 22000 },
    { key: "marathon", min: 41000, max: 43500 },
  ];

  const results: Record<string, PersonalBest> = {};

  for (const { key, min, max } of distanceRanges) {
    const best = await prisma.activity.findFirst({
      where: {
        userId: user.id,
        distance: { gte: min, lte: max },
        averageSpeed: { not: null },
      },
      orderBy: { averageSpeed: "desc" },
      select: {
        id: true,
        duration: true,
        averageSpeed: true,
        startTimeLocal: true,
      },
    });

    if (best && best.averageSpeed) {
      const d = best.duration;
      let time: string;
      if (d < 3600) {
        time = `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, "0")}`;
      } else {
        time = `${Math.floor(d / 3600)}:${String(Math.floor((d % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(d % 60)).padStart(2, "0")}`;
      }

      results[key] = {
        time,
        pace: formatPace(best.averageSpeed),
        date: best.startTimeLocal,
        activityId: best.id,
      };
    }
  }

  return results;
}
