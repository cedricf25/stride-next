"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type {
  PredictionContextSnapshot,
  EnrichedPrediction,
  PredictionsResult,
  GeminiPredictionsResponse,
  HeartRateZones,
} from "@/types/predictions";
import { average, formatPace } from "./predictions";

const PREDICTIONS_PROMPT = `Tu es un coach expert en course à pied spécialisé dans la prédiction de performances.

Analyse le profil complet du coureur (physiologie, entraînement, récupération) et ses activités récentes pour prédire ses temps de course réalistes.

Tu dois répondre UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaires), respectant exactement cette structure :
{
  "predictions": [
    {
      "distance": "5km",
      "label": "5 km",
      "predictedTime": "23:45",
      "predictedPace": "4:45 /km",
      "confidence": 85,
      "comment": "Explication courte de la prédiction basée sur les données",
      "estimatedSplits": ["4:50", "4:45", "4:42", "4:44", "4:44"],
      "raceStrategy": "Départ contrôlé les 2 premiers km, puis accélération progressive. Finir fort sur le dernier km si les sensations sont bonnes.",
      "heartRateZones": {
        "start": "Z3 (155-165 bpm)",
        "middle": "Z4 (165-175 bpm)",
        "finish": "Z4-Z5 (175-185 bpm)"
      }
    }
  ],
  "summary": "Analyse globale du niveau du coureur en 3-4 phrases",
  "recoveryImpact": "Impact de l'état de récupération actuel sur les prédictions (HRV, sommeil, stress, fatigue). 1-2 phrases.",
  "trainingRecommendations": "2-3 recommandations spécifiques pour améliorer les performances futures"
}

Les distances à prédire sont : 5km, 10km, Semi-marathon (21.1km), Marathon (42.2km), Trail 50km.

Règles :
- Base tes prédictions sur les données réelles : VO2max, allures récentes, volume d'entraînement, FC, TSS, récupération
- Utilise des modèles reconnus (Riegel, Daniels, Cameron) pour extrapoler les temps
- Tiens compte de l'état de récupération (HRV, sommeil, stress, Body Battery) pour ajuster les prédictions
- La confidence doit refléter si le coureur a le volume et l'expérience pour la distance
- Pour le trail 50km, tiens compte du dénivelé typique (~2500m D+) et de l'expérience longue distance
- Les splits doivent être réalistes et refléter une stratégie de course (negative split recommandé)
- Les zones FC doivent être cohérentes avec la FC max du coureur
- Sois réaliste et honnête, pas optimiste
- Les temps doivent être cohérents entre eux`;

/** Génère de nouvelles prédictions via Gemini et les enregistre en DB */
export async function generatePredictions(): Promise<PredictionsResult> {
  const user = await getAuthenticatedUser();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set");

  // Récupérer les activités récentes
  const recentActivities = await prisma.activity.findMany({
    where: { userId: user.id },
    orderBy: { startTimeLocal: "desc" },
    take: 50,
  });

  if (recentActivities.length === 0) {
    throw new Error(
      "Aucune activité trouvée. Synchronise tes données Garmin d'abord."
    );
  }

  // Calculer les périodes
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 3600 * 1000);
  const twentyEightDaysAgo = new Date(now - 28 * 24 * 3600 * 1000);
  const eightyFourDaysAgo = new Date(now - 84 * 24 * 3600 * 1000);

  // Filtrer les activités par période
  const last4Weeks = recentActivities.filter(
    (a) => a.startTimeLocal > twentyEightDaysAgo
  );
  const last12Weeks = recentActivities.filter(
    (a) => a.startTimeLocal > eightyFourDaysAgo
  );

  // Récupérer les données de récupération
  const [sleepRecords7d, healthMetrics7d, latestBodyFat] = await Promise.all([
    prisma.sleepRecord.findMany({
      where: { userId: user.id, calendarDate: { gte: sevenDaysAgo } },
      select: {
        avgOvernightHRV: true,
        sleepScore: true,
        totalSleepSeconds: true,
      },
    }),
    prisma.healthMetric.findMany({
      where: { userId: user.id, calendarDate: { gte: sevenDaysAgo } },
      select: { stressLevel: true, bodyBattery: true },
    }),
    prisma.healthMetric.findFirst({
      where: { userId: user.id, bodyFatPercentage: { not: null } },
      orderBy: { calendarDate: "desc" },
      select: { bodyFatPercentage: true },
    }),
  ]);

  // Calculer les métriques
  const weeklyVolume4w =
    last4Weeks.reduce((sum, a) => sum + a.distance, 0) / 1000 / 4;
  const weeklyVolume12w =
    last12Weeks.reduce((sum, a) => sum + a.distance, 0) / 1000 / 12;

  const avgSpeed =
    last4Weeks.length > 0
      ? last4Weeks.reduce((sum, a) => sum + (a.averageSpeed ?? 0), 0) /
        last4Weeks.length
      : 0;

  const longestRun = Math.max(
    ...recentActivities.map((a) => a.distance / 1000),
    0
  );
  const latestVO2max = recentActivities.find((a) => a.vo2max)?.vo2max ?? null;

  // Moyennes récupération 7j
  const avgSleepScore7d = await average(sleepRecords7d.map((s) => s.sleepScore));
  const avgHRV7d = await average(sleepRecords7d.map((s) => s.avgOvernightHRV));
  const avgSleepHours7d = await average(
    sleepRecords7d.map((s) =>
      s.totalSleepSeconds ? s.totalSleepSeconds / 3600 : null
    )
  );
  const avgStressLevel7d = await average(healthMetrics7d.map((h) => h.stressLevel));
  const avgBodyBattery7d = await average(healthMetrics7d.map((h) => h.bodyBattery));

  // Charge d'entraînement
  const cumulativeTSS28d = last4Weeks.reduce(
    (sum, a) => sum + (a.trainingStressScore ?? 0),
    0
  );
  const avgAerobicTE = await average(last4Weeks.map((a) => a.aerobicTrainingEffect));
  const avgAnaerobicTE = await average(
    last4Weeks.map((a) => a.anaerobicTrainingEffect)
  );

  // Records personnels
  const bestEfforts: Record<string, string> = {};
  const distances = [
    { key: "5km", min: 4800, max: 5500 },
    { key: "10km", min: 9500, max: 11000 },
    { key: "semi", min: 20000, max: 22000 },
  ];

  for (const { key, min, max } of distances) {
    const best = recentActivities
      .filter((a) => a.distance >= min && a.distance <= max)
      .sort((a, b) => (b.averageSpeed ?? 0) - (a.averageSpeed ?? 0))[0];

    if (best) {
      const d = best.duration;
      if (d < 3600) {
        bestEfforts[key] = `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, "0")}`;
      } else {
        bestEfforts[key] = `${Math.floor(d / 3600)}h${String(Math.floor((d % 3600) / 60)).padStart(2, "0")}`;
      }
    }
  }

  // Construire le snapshot de contexte
  const contextSnapshot: PredictionContextSnapshot = {
    vo2max: latestVO2max,
    weight: user.weight,
    restingHR: user.restingHR,
    maxHR: user.maxHR,
    bodyFatPercentage: latestBodyFat?.bodyFatPercentage ?? null,
    weeklyVolume4w: Math.round(weeklyVolume4w * 10) / 10,
    weeklyVolume12w: Math.round(weeklyVolume12w * 10) / 10,
    longestRun: Math.round(longestRun * 10) / 10,
    activitiesCount4w: last4Weeks.length,
    cumulativeTSS28d: cumulativeTSS28d > 0 ? Math.round(cumulativeTSS28d) : null,
    avgAerobicTE: avgAerobicTE ? Math.round(avgAerobicTE * 10) / 10 : null,
    avgAnaerobicTE: avgAnaerobicTE
      ? Math.round(avgAnaerobicTE * 10) / 10
      : null,
    avgSleepScore7d: avgSleepScore7d ? Math.round(avgSleepScore7d) : null,
    avgSleepHours7d: avgSleepHours7d
      ? Math.round(avgSleepHours7d * 10) / 10
      : null,
    avgHRV7d: avgHRV7d ? Math.round(avgHRV7d) : null,
    avgBodyBattery7d: avgBodyBattery7d ? Math.round(avgBodyBattery7d) : null,
    avgStressLevel7d: avgStressLevel7d ? Math.round(avgStressLevel7d) : null,
    avgPace: avgSpeed > 0 ? await formatPace(avgSpeed) : null,
    bestEfforts,
  };

  // Construire les dernières performances pour le prompt
  const performances = recentActivities
    .filter((a) => a.distance > 3000)
    .map((a) => ({
      distanceKm: +(a.distance / 1000).toFixed(1),
      durationMin: +(a.duration / 60).toFixed(1),
      paceSecPerKm: a.averageSpeed ? Math.round(1000 / a.averageSpeed) : null,
      avgHR: a.averageHR,
      tss: a.trainingStressScore ? Math.round(a.trainingStressScore) : null,
      aerobicTE: a.aerobicTrainingEffect,
      date: a.startTimeLocal.toISOString().split("T")[0],
    }))
    .slice(0, 15);

  // Construire le prompt enrichi
  const nowStr = new Date().toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const lastSyncStr = user.lastSyncAt
    ? user.lastSyncAt.toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "jamais";

  const prompt = `Date et heure actuelles : ${nowStr}
Dernière synchronisation Garmin : ${lastSyncStr}

Prédit les temps de course pour ce coureur :

## Profil physiologique
- VO2max : ${latestVO2max ?? "inconnu"}
- Poids : ${user.weight ?? "inconnu"} kg
- Composition corporelle : ${latestBodyFat?.bodyFatPercentage ? `${latestBodyFat.bodyFatPercentage.toFixed(1)}% MG` : "inconnue"}
- FC repos : ${user.restingHR ?? "inconnue"} bpm
- FC max : ${user.maxHR ?? "inconnue"} bpm

## Volume d'entraînement
- 4 dernières semaines : ${weeklyVolume4w.toFixed(1)} km/semaine (${last4Weeks.length} sorties)
- 12 dernières semaines : ${weeklyVolume12w.toFixed(1)} km/semaine
- Plus longue sortie récente : ${longestRun.toFixed(1)} km

## Charge d'entraînement
- TSS cumulé 28j : ${cumulativeTSS28d > 0 ? cumulativeTSS28d.toFixed(0) : "N/A"}
- Training Effect aérobie moyen : ${avgAerobicTE?.toFixed(1) ?? "N/A"}
- Training Effect anaérobie moyen : ${avgAnaerobicTE?.toFixed(1) ?? "N/A"}

## État de récupération (moyenne 7 derniers jours)
- Score de sommeil : ${avgSleepScore7d?.toFixed(0) ?? "N/A"}/100
- Durée de sommeil : ${avgSleepHours7d?.toFixed(1) ?? "N/A"} h
- HRV nocturne : ${avgHRV7d?.toFixed(0) ?? "N/A"} ms
- Body Battery moyen : ${avgBodyBattery7d?.toFixed(0) ?? "N/A"}/100
- Niveau de stress : ${avgStressLevel7d?.toFixed(0) ?? "N/A"}/100

## Records personnels récents
${Object.keys(bestEfforts).length > 0 ? Object.entries(bestEfforts).map(([d, t]) => `- ${d} : ${t}`).join("\n") : "Pas de records récents sur distances standard."}

## Dernières courses significatives
${JSON.stringify(performances, null, 2)}

Allure moyenne récente : ${avgSpeed > 0 ? await formatPace(avgSpeed) : "N/A"}`;

  // Appeler Gemini
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      systemInstruction: PREDICTIONS_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const text = response.text ?? "{}";
  const generated: GeminiPredictionsResponse = JSON.parse(text);
  const generatedAt = new Date();

  // Calculer la confidence moyenne
  const avgConfidence =
    generated.predictions?.length > 0
      ? Math.round(
          generated.predictions.reduce((sum, p) => sum + (p.confidence ?? 0), 0) /
            generated.predictions.length
        )
      : null;

  // Créer le batch et les prédictions
  const batch = await prisma.racePredictionBatch.create({
    data: {
      userId: user.id,
      generatedAt,
      summary: generated.summary ?? "",
      contextSnapshot: JSON.stringify(contextSnapshot),
      recoveryImpact: generated.recoveryImpact ?? null,
      recommendations: generated.trainingRecommendations ?? null,
      avgConfidence,
      predictions: {
        create: (generated.predictions ?? []).map((p) => ({
          distance: p.distance ?? "",
          label: p.label ?? p.distance ?? "",
          predictedTime: p.predictedTime ?? "",
          predictedPace: p.predictedPace ?? "",
          confidence: p.confidence ?? 50,
          comment: p.comment ?? "",
          estimatedSplits: p.estimatedSplits
            ? JSON.stringify(p.estimatedSplits)
            : null,
          raceStrategy: p.raceStrategy ?? null,
          heartRateZones: p.heartRateZones
            ? JSON.stringify(p.heartRateZones)
            : null,
        })),
      },
    },
    include: { predictions: true },
  });

  // Construire le résultat
  const predictions: EnrichedPrediction[] = batch.predictions.map((p) => ({
    distance: p.distance,
    label: p.label,
    predictedTime: p.predictedTime,
    predictedPace: p.predictedPace,
    confidence: p.confidence,
    comment: p.comment,
    estimatedSplits: p.estimatedSplits ? JSON.parse(p.estimatedSplits) : null,
    raceStrategy: p.raceStrategy,
    heartRateZones: p.heartRateZones
      ? (JSON.parse(p.heartRateZones) as HeartRateZones)
      : null,
  }));

  return {
    id: batch.id,
    predictions,
    summary: batch.summary,
    recoveryImpact: batch.recoveryImpact,
    recommendations: batch.recommendations,
    generatedAt: batch.generatedAt,
    contextSnapshot,
  };
}
