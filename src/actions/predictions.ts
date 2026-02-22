"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";

export interface RacePredictionData {
  distance: string;
  label: string;
  predictedTime: string;
  predictedPace: string;
  confidence: number;
  comment: string;
}

export interface PredictionsResult {
  predictions: RacePredictionData[];
  summary: string;
  generatedAt: Date;
}

const PREDICTIONS_PROMPT = `Tu es un coach expert en course à pied spécialisé dans la prédiction de performances.

Analyse le profil du coureur et ses activités récentes pour prédire ses temps de course réalistes.

Tu dois répondre UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaires), respectant exactement cette structure :
{
  "predictions": [
    {
      "distance": "5km",
      "label": "5 km",
      "predictedTime": "string - ex: 23:45",
      "predictedPace": "string - ex: 4:45 /km",
      "confidence": number, // 0-100, niveau de fiabilité de la prédiction
      "comment": "string - explication courte de la prédiction"
    }
  ],
  "summary": "string - analyse globale du niveau du coureur (3-4 phrases)"
}

Les distances à prédire sont : 5km, 10km, Semi-marathon (21.1km), Marathon (42.2km), Trail 50km.

Règles :
- Base tes prédictions sur les données réelles : VO2max, allures récentes, volume d'entraînement, FC, poids
- Utilise des modèles reconnus (Riegel, Daniels, Cameron) pour extrapoler les temps
- La confidence doit refléter si le coureur a le volume et l'expérience pour la distance (ex: un coureur qui n'a jamais dépassé 15km aura une confidence basse pour le marathon)
- Pour le trail 50km, tiens compte du dénivelé typique (~2500m D+) et de l'expérience longue distance
- Sois réaliste et honnête, pas optimiste
- Les temps doivent être cohérents entre eux (le 10km ne peut pas être plus rapide que 2x le 5km)`;

/** Charge les prédictions depuis la DB (sans appel IA) */
export async function fetchSavedPredictions(): Promise<PredictionsResult | null> {
  const user = await getAuthenticatedUser();

  const rows = await prisma.racePrediction.findMany({
    where: { userId: user.id },
    orderBy: { generatedAt: "desc" },
    take: 5,
  });

  if (rows.length === 0) return null;

  // Toutes les prédictions du même batch (même generatedAt)
  const batchDate = rows[0].generatedAt;
  const batch = rows.filter(
    (r) => r.generatedAt.getTime() === batchDate.getTime()
  );

  return {
    predictions: batch.map((r) => ({
      distance: r.distance,
      label: r.label,
      predictedTime: r.predictedTime,
      predictedPace: r.predictedPace,
      confidence: r.confidence,
      comment: r.comment,
    })),
    summary: batch[0].summary,
    generatedAt: batchDate,
  };
}

/** Génère de nouvelles prédictions via Gemini et les enregistre en DB */
export async function generatePredictions(): Promise<PredictionsResult> {
  const user = await getAuthenticatedUser();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set");

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

  // Métriques
  const last4Weeks = recentActivities.filter(
    (a) => a.startTimeLocal > new Date(Date.now() - 28 * 24 * 3600 * 1000)
  );
  const last12Weeks = recentActivities.filter(
    (a) => a.startTimeLocal > new Date(Date.now() - 84 * 24 * 3600 * 1000)
  );

  const weeklyVolume4w =
    last4Weeks.reduce((sum, a) => sum + a.distance, 0) / 1000 / 4;
  const weeklyVolume12w =
    last12Weeks.reduce((sum, a) => sum + a.distance, 0) / 1000 / 12;

  const avgPace =
    last4Weeks.length > 0
      ? last4Weeks.reduce((sum, a) => sum + (a.averageSpeed ?? 0), 0) /
        last4Weeks.length
      : 0;

  const performances = recentActivities
    .filter((a) => a.distance > 3000)
    .map((a) => ({
      distanceKm: +(a.distance / 1000).toFixed(1),
      durationMin: +(a.duration / 60).toFixed(1),
      paceSecPerKm: a.averageSpeed ? Math.round(1000 / a.averageSpeed) : null,
      avgHR: a.averageHR,
      date: a.startTimeLocal.toISOString().split("T")[0],
    }))
    .slice(0, 20);

  const longestRun = Math.max(
    ...recentActivities.map((a) => a.distance / 1000),
    0
  );
  const latestVO2max = recentActivities.find((a) => a.vo2max)?.vo2max ?? null;

  const fastest5k = recentActivities
    .filter((a) => a.distance >= 4800 && a.distance <= 5500)
    .sort((a, b) => (b.averageSpeed ?? 0) - (a.averageSpeed ?? 0))[0];
  const fastest10k = recentActivities
    .filter((a) => a.distance >= 9500 && a.distance <= 11000)
    .sort((a, b) => (b.averageSpeed ?? 0) - (a.averageSpeed ?? 0))[0];
  const fastestHalf = recentActivities
    .filter((a) => a.distance >= 20000 && a.distance <= 22000)
    .sort((a, b) => (b.averageSpeed ?? 0) - (a.averageSpeed ?? 0))[0];

  const bestEfforts: Record<string, string> = {};
  if (fastest5k) {
    const d = fastest5k.duration;
    bestEfforts["5km"] = `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, "0")}`;
  }
  if (fastest10k) {
    const d = fastest10k.duration;
    bestEfforts["10km"] = `${Math.floor(d / 3600)}h${String(Math.floor((d % 3600) / 60)).padStart(2, "0")}`;
  }
  if (fastestHalf) {
    const d = fastestHalf.duration;
    bestEfforts["semi"] = `${Math.floor(d / 3600)}h${String(Math.floor((d % 3600) / 60)).padStart(2, "0")}`;
  }

  const nowStr = new Date().toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const lastSyncStr = user.lastSyncAt
    ? user.lastSyncAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : "jamais";

  const prompt = `Date et heure actuelles : ${nowStr}
Dernière synchronisation Garmin : ${lastSyncStr}

Prédit les temps de course pour ce coureur :

Profil :
- VO2max : ${latestVO2max ?? "inconnu"}
- Poids : ${user.weight ?? "inconnu"} kg
- FC repos : ${user.restingHR ?? "inconnue"} bpm
- FC max : ${user.maxHR ?? "inconnue"} bpm

Volume d'entraînement :
- 4 dernières semaines : ${weeklyVolume4w.toFixed(1)} km/semaine (${last4Weeks.length} sorties)
- 12 dernières semaines : ${weeklyVolume12w.toFixed(1)} km/semaine
- Plus longue sortie récente : ${longestRun.toFixed(1)} km

${Object.keys(bestEfforts).length > 0 ? `Records personnels récents :\n${Object.entries(bestEfforts).map(([d, t]) => `- ${d} : ${t}`).join("\n")}` : "Pas de records récents sur distances standard."}

Dernières courses (les plus significatives) :
${JSON.stringify(performances, null, 2)}

Allure moyenne récente : ${avgPace > 0 ? `${Math.floor(1000 / avgPace / 60)}:${String(Math.floor((1000 / avgPace) % 60)).padStart(2, "0")} /km` : "N/A"}`;

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: PREDICTIONS_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const text = response.text ?? "{}";
  const generated = JSON.parse(text);
  const now = new Date();

  // Supprimer les anciennes prédictions
  await prisma.racePrediction.deleteMany({ where: { userId: user.id } });

  // Sauvegarder les nouvelles
  const summary: string = generated.summary ?? "";
  const predictions: RacePredictionData[] = [];

  if (Array.isArray(generated.predictions)) {
    for (const p of generated.predictions) {
      await prisma.racePrediction.create({
        data: {
          userId: user.id,
          distance: p.distance ?? "",
          label: p.label ?? p.distance ?? "",
          predictedTime: p.predictedTime ?? "",
          predictedPace: p.predictedPace ?? "",
          confidence: p.confidence ?? 50,
          comment: p.comment ?? "",
          summary,
          generatedAt: now,
        },
      });

      predictions.push({
        distance: p.distance ?? "",
        label: p.label ?? p.distance ?? "",
        predictedTime: p.predictedTime ?? "",
        predictedPace: p.predictedPace ?? "",
        confidence: p.confidence ?? 50,
        comment: p.comment ?? "",
      });
    }
  }

  return { predictions, summary, generatedAt: now };
}
