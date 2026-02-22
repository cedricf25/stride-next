"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type { AnalysisResponse } from "@/types/garmin";

const ACTIVITY_SYSTEM_PROMPT = `Tu es un coach expert en course à pied. Analyse en détail cette séance de course à pied.

Fournis :
1. **Résumé** : Type de séance et performance globale
2. **Analyse des splits** : Régularité, stratégie d'allure (negative split, etc.)
3. **Fréquence cardiaque** : Zones d'effort, récupération, dérive cardiaque
4. **Dynamique de course** : Cadence, temps de contact au sol, oscillation verticale si disponible
5. **Training Effect** : Interprétation de l'effet d'entraînement aérobie/anaérobie
6. **Points à améliorer** : Recommandations spécifiques basées sur les données
7. **Comparaison** : Positionnement par rapport aux séances récentes si contexte fourni

Sois précis, utilise les chiffres, et donne des conseils actionnables.
Réponds en français.`;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY must be set in .env.local");
  }
  return new GoogleGenAI({ apiKey });
}

const GLOBAL_COACHING_PROMPT = `Tu es un coach expert en course à pied et en bien-être. Analyse de manière globale les données suivantes et fournis un coaching complet :

1. **Charge d'entraînement** : Volume, intensité, répartition facile/dur, tendance
2. **Performances** : Allures, progression, zones cardiaques
3. **Récupération** : Qualité du sommeil, HRV, FC repos, Body Battery
4. **Gestion du poids** : Tendance, impact sur la performance
5. **Risques** : Signes de surentraînement, risque de blessure
6. **Plan d'entraînement** : Si un plan actif existe, analyse de l'adhérence (planifié vs réalisé)
7. **Recommandations 2 semaines** : Programme suggéré pour les 2 prochaines semaines

Sois précis, encourage les points positifs, alerte sur les risques.
Réponds en français.`;

export async function analyzeGlobalCoaching(): Promise<AnalysisResponse> {
  try {
    const user = await getAuthenticatedUser();
    const ai = getAI();

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

    // Load comprehensive data
    const [activities, sleepData, healthData, activePlan] = await Promise.all([
      prisma.activity.findMany({
        where: { userId: user.id },
        orderBy: { startTimeLocal: "desc" },
        take: 30,
      }),
      prisma.sleepRecord.findMany({
        where: { userId: user.id, calendarDate: { gte: fourteenDaysAgo } },
        orderBy: { calendarDate: "desc" },
      }),
      prisma.healthMetric.findMany({
        where: { userId: user.id, calendarDate: { gte: fourteenDaysAgo } },
        orderBy: { calendarDate: "desc" },
      }),
      prisma.trainingPlan.findFirst({
        where: { userId: user.id, status: "active" },
        include: {
          weeks: { include: { sessions: true }, orderBy: { weekNumber: "asc" } },
        },
      }),
    ]);

    if (activities.length === 0) {
      return {
        analysis: "",
        error: "Aucune activité en base. Synchronisez vos données Garmin d'abord.",
      };
    }

    const activitiesData = activities.map((a) => ({
      date: a.startTimeLocal.toISOString().split("T")[0],
      name: a.activityName,
      distanceKm: +(a.distance / 1000).toFixed(2),
      durationMin: +(a.duration / 60).toFixed(1),
      avgSpeedMps: a.averageSpeed,
      avgHR: a.averageHR,
      maxHR: a.maxHR,
      elevGain: a.elevationGain ? Math.round(a.elevationGain) : null,
      aerobicTE: a.aerobicTrainingEffect,
      anaerobicTE: a.anaerobicTrainingEffect,
      vo2max: a.vo2max,
    }));

    const sleepSummary = sleepData.map((s) => ({
      date: s.calendarDate.toISOString().split("T")[0],
      totalHours: s.totalSleepSeconds ? +(s.totalSleepSeconds / 3600).toFixed(1) : null,
      deepPct: s.totalSleepSeconds && s.deepSleepSeconds
        ? +((s.deepSleepSeconds / s.totalSleepSeconds) * 100).toFixed(0)
        : null,
      score: s.sleepScore,
      hrv: s.avgOvernightHRV,
      restHR: s.restingHeartRate,
    }));

    const healthSummary = healthData.map((h) => ({
      date: h.calendarDate.toISOString().split("T")[0],
      restHR: h.restingHeartRate,
      weight: h.weight,
      steps: h.totalSteps,
    }));

    let planContext = null;
    if (activePlan) {
      const totalSessions = activePlan.weeks.reduce(
        (sum, w) => sum + w.sessions.length,
        0
      );
      const completed = activePlan.weeks.reduce(
        (sum, w) => sum + w.sessions.filter((s) => s.completed).length,
        0
      );
      planContext = {
        name: activePlan.name,
        raceType: activePlan.raceType,
        raceDate: activePlan.raceDate?.toISOString().split("T")[0],
        targetTime: activePlan.targetTime,
        progress: `${completed}/${totalSessions} séances`,
        daysPerWeek: activePlan.daysPerWeek,
      };
    }

    const userProfile = {
      vo2max: user.vo2max,
      weight: user.weight,
      restingHR: user.restingHR,
      maxHR: user.maxHR,
    };

    const nowStr = now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
    const lastSyncStr = user.lastSyncAt
      ? user.lastSyncAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
      : "jamais";

    const prompt = `## Date et heure actuelles
${nowStr}

## Dernière synchronisation Garmin
${lastSyncStr}

## Profil coureur
${JSON.stringify(userProfile, null, 2)}

## 30 dernières activités
${JSON.stringify(activitiesData, null, 2)}

## Sommeil (14 jours)
${JSON.stringify(sleepSummary, null, 2)}

## Santé (14 jours)
${JSON.stringify(healthSummary, null, 2)}

${planContext ? `## Plan d'entraînement actif\n${JSON.stringify(planContext, null, 2)}` : "Aucun plan d'entraînement actif."}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: GLOBAL_COACHING_PROMPT,
        temperature: 0.7,
      },
    });

    const analysis = response.text ?? "";
    return { analysis };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error in global coaching:", error);
    return {
      analysis: "",
      error:
        error instanceof Error
          ? error.message
          : "Failed to analyze",
    };
  }
}

export async function analyzeActivity(
  garminActivityId: number
): Promise<AnalysisResponse> {
  try {
    // Check cache
    const activity = await prisma.activity.findUnique({
      where: { garminActivityId: BigInt(garminActivityId) },
      include: {
        splits: { orderBy: { splitNumber: "asc" } },
        analysis: true,
        user: true,
      },
    });

    if (!activity) {
      return { analysis: "", error: "Activité introuvable" };
    }

    if (activity.analysis) {
      return { analysis: activity.analysis.analysis };
    }

    // Load recent activities for context
    const recentActivities = await prisma.activity.findMany({
      where: {
        userId: activity.userId,
        id: { not: activity.id },
      },
      orderBy: { startTimeLocal: "desc" },
      take: 10,
    });

    const ai = getAI();

    const activityData = {
      name: activity.activityName,
      date: activity.startTimeLocal.toISOString(),
      distance: activity.distance,
      duration: activity.duration,
      averageSpeed: activity.averageSpeed,
      averageHR: activity.averageHR,
      maxHR: activity.maxHR,
      elevationGain: activity.elevationGain,
      elevationLoss: activity.elevationLoss,
      averageCadence: activity.averageCadence,
      averageStrideLength: activity.averageStrideLength,
      averageGCT: activity.averageGCT,
      averageVerticalOscillation: activity.averageVerticalOscillation,
      aerobicTrainingEffect: activity.aerobicTrainingEffect,
      anaerobicTrainingEffect: activity.anaerobicTrainingEffect,
      trainingStressScore: activity.trainingStressScore,
      vo2max: activity.vo2max,
      splits: activity.splits.map((s) => ({
        km: s.splitNumber,
        speed: s.averageSpeed,
        hr: s.averageHR,
        cadence: s.averageCadence,
        elevGain: s.elevationGain,
        gct: s.averageGCT,
      })),
    };

    const context = recentActivities.map((a) => ({
      date: a.startTimeLocal.toISOString().split("T")[0],
      distance: a.distance,
      duration: a.duration,
      averageSpeed: a.averageSpeed,
      averageHR: a.averageHR,
    }));

    const userProfile = {
      vo2max: activity.user.vo2max,
      weight: activity.user.weight,
      restingHR: activity.user.restingHR,
      maxHR: activity.user.maxHR,
    };

    const now = new Date();
    const nowStr = now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
    const lastSyncStr = activity.user.lastSyncAt
      ? activity.user.lastSyncAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
      : "jamais";

    const prompt = `## Date et heure actuelles
${nowStr}

## Dernière synchronisation Garmin
${lastSyncStr}

## Séance à analyser
${JSON.stringify(activityData, null, 2)}

## Profil coureur
${JSON.stringify(userProfile, null, 2)}

## 10 dernières séances (contexte)
${JSON.stringify(context, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: ACTIVITY_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const analysisText = response.text ?? "";

    // Cache the result
    await prisma.activityAnalysis.create({
      data: {
        activityId: activity.id,
        analysis: analysisText,
        model: "gemini-3-flash-preview",
      },
    });

    return { analysis: analysisText };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error analyzing activity:", error);
    return {
      analysis: "",
      error:
        error instanceof Error
          ? error.message
          : "Failed to analyze activity",
    };
  }
}
