/**
 * Types pour les prédictions de course
 */

/** Snapshot du contexte utilisé pour générer les prédictions */
export interface PredictionContextSnapshot {
  // Profil physiologique
  vo2max: number | null;
  weight: number | null;
  restingHR: number | null;
  maxHR: number | null;
  bodyFatPercentage: number | null;

  // Volume d'entraînement
  weeklyVolume4w: number;
  weeklyVolume12w: number;
  longestRun: number;
  activitiesCount4w: number;

  // Charge d'entraînement
  cumulativeTSS28d: number | null;
  avgAerobicTE: number | null;
  avgAnaerobicTE: number | null;

  // Récupération (moyennes 7j)
  avgSleepScore7d: number | null;
  avgSleepHours7d: number | null;
  avgHRV7d: number | null;
  avgBodyBattery7d: number | null;
  avgStressLevel7d: number | null;

  // Performances
  avgPace: string | null;
  bestEfforts: Record<string, string>;
}

/** Zones FC par phase de course */
export interface HeartRateZones {
  start: string;
  middle: string;
  finish: string;
}

/** Prédiction enrichie avec détails */
export interface EnrichedPrediction {
  distance: string;
  label: string;
  predictedTime: string;
  predictedPace: string;
  confidence: number;
  comment: string;
  estimatedSplits: string[] | null;
  raceStrategy: string | null;
  heartRateZones: HeartRateZones | null;
}

/** Résumé d'un batch pour la liste historique */
export interface PredictionBatchSummary {
  id: string;
  generatedAt: Date;
  summary: string;
  avgConfidence: number | null;
  predictionsCount: number;
}

/** Résultat complet d'un batch de prédictions */
export interface PredictionsResult {
  id: string;
  predictions: EnrichedPrediction[];
  summary: string;
  recoveryImpact: string | null;
  recommendations: string | null;
  generatedAt: Date;
  contextSnapshot: PredictionContextSnapshot | null;
}

/** Différence d'une prédiction entre deux batches */
export interface PredictionDiff {
  distance: string;
  label: string;
  timeBefore: string;
  timeAfter: string;
  timeDiffSeconds: number; // positif = plus lent, négatif = plus rapide
  confidenceBefore: number;
  confidenceAfter: number;
}

/** Changement de contexte entre deux batches */
export interface ContextChange {
  field: string;
  label: string;
  before: string | number | null;
  after: string | number | null;
  unit?: string;
}

/** Comparaison de deux batches de prédictions */
export interface PredictionComparison {
  batchA: PredictionBatchSummary;
  batchB: PredictionBatchSummary;
  diffs: PredictionDiff[];
  contextChanges: ContextChange[];
}

/** Record personnel pour une distance */
export interface PersonalBest {
  time: string;
  pace: string;
  date: Date;
  activityId: string;
}

/** Format de réponse IA pour les prédictions */
export interface GeminiPredictionsResponse {
  predictions: Array<{
    distance: string;
    label: string;
    predictedTime: string;
    predictedPace: string;
    confidence: number;
    comment: string;
    estimatedSplits?: string[];
    raceStrategy?: string;
    heartRateZones?: HeartRateZones;
  }>;
  summary: string;
  recoveryImpact?: string;
  trainingRecommendations?: string;
}
