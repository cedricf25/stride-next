"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type { AnalysisResponse } from "@/types/garmin";

export interface HealthAnalysisResult {
  analysis: string;
  createdAt: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dataPointsCount: number;
  error?: string;
}

const ACTIVITY_SYSTEM_PROMPT = `Tu es un coach expert en course à pied. Analyse en détail cette séance de course à pied.

Fournis :
1. **Résumé** : Type de séance et performance globale
2. **Analyse des splits** : Régularité, stratégie d'allure (negative split, etc.)
3. **Fréquence cardiaque** : Zones d'effort, récupération, dérive cardiaque
4. **Dynamique de course** : Cadence, temps de contact au sol, oscillation verticale si disponible
5. **Puissance** : Running Power moyenne/max/normalisée (si disponible), efficacité énergétique
6. **Stamina** : Analyse du stamina restant en fin de séance et potentiel (si disponible)
7. **Dépense énergétique** : Calories brûlées, rapport effort/distance
8. **Training Effect** : Interprétation de l'effet d'entraînement aérobie/anaérobie
9. **Points à améliorer** : Recommandations spécifiques basées sur les données
10. **Comparaison** : Positionnement par rapport aux séances récentes si contexte fourni

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

export async function deleteActivityAnalysis(garminActivityId: number): Promise<void> {
  const activity = await prisma.activity.findUnique({
    where: { garminActivityId: BigInt(garminActivityId) },
    select: { id: true },
  });

  if (activity) {
    await prisma.activityAnalysis.deleteMany({
      where: { activityId: activity.id },
    });
  }
}

export async function reanalyzeActivity(
  garminActivityId: number
): Promise<AnalysisResponse> {
  await deleteActivityAnalysis(garminActivityId);
  return analyzeActivity(garminActivityId);
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
      take: 16,
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
      calories: activity.calories,
      elevationGain: activity.elevationGain,
      elevationLoss: activity.elevationLoss,
      averageCadence: activity.averageCadence,
      averageStrideLength: activity.averageStrideLength,
      averageGCT: activity.averageGCT,
      averageVerticalOscillation: activity.averageVerticalOscillation,
      averagePower: activity.averagePower,
      maxPower: activity.maxPower,
      normalizedPower: activity.normalizedPower,
      staminaPercent: activity.staminaPercent,
      potentialStamina: activity.potentialStamina,
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

## 16 dernières séances (contexte)
${JSON.stringify(context, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: ACTIVITY_SYSTEM_PROMPT,
        temperature: 0.1,
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

const HRV_ANALYSIS_PROMPT = `Tu es un expert en physiologie et récupération sportive. Analyse les données de variabilité de fréquence cardiaque (HRV) nocturne fournies.

Fournis une analyse structurée couvrant :

1. **État actuel** : Niveau de HRV par rapport aux normes pour un coureur, interprétation de la valeur moyenne
2. **Tendance** : Évolution sur la période (stable, en amélioration, en déclin), identification de patterns
3. **Récupération** : Ce que révèle la HRV sur la capacité de récupération et l'état du système nerveux autonome
4. **Corrélations** : Liens avec le sommeil, le stress, l'entraînement si données disponibles
5. **Points d'attention** : Jours avec HRV anormalement basse ou haute, explications possibles
6. **Recommandations** : Conseils pour optimiser la HRV (sommeil, stress, entraînement, alimentation)

Sois précis avec les chiffres. Contextualise par rapport à un coureur de niveau amateur/intermédiaire.
Réponds en français, de manière concise mais complète.`;

export async function fetchHrvAnalysis(): Promise<HealthAnalysisResult> {
  try {
    const user = await getAuthenticatedUser();

    // Check for cached analysis
    const cached = await prisma.healthAnalysis.findUnique({
      where: {
        userId_pageType: {
          userId: user.id,
          pageType: "hrv",
        },
      },
    });

    if (cached) {
      return {
        analysis: cached.analysis,
        createdAt: cached.createdAt,
        periodStart: cached.periodStart,
        periodEnd: cached.periodEnd,
        dataPointsCount: cached.dataPointsCount,
      };
    }

    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error fetching HRV analysis:", error);
    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}

export async function generateHrvAnalysis(): Promise<HealthAnalysisResult> {
  try {
    const user = await getAuthenticatedUser();
    const ai = getAI();

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

    // Load HRV data
    const sleepData = await prisma.sleepRecord.findMany({
      where: {
        userId: user.id,
        calendarDate: { gte: ninetyDaysAgo },
        avgOvernightHRV: { not: null },
      },
      orderBy: { calendarDate: "asc" },
    });

    if (sleepData.length === 0) {
      return {
        analysis: "",
        createdAt: null,
        periodStart: null,
        periodEnd: null,
        dataPointsCount: 0,
        error: "Aucune donnée HRV disponible. Synchronisez vos données Garmin.",
      };
    }

    // Load related data for context
    const activities = await prisma.activity.findMany({
      where: { userId: user.id, startTimeLocal: { gte: ninetyDaysAgo } },
      orderBy: { startTimeLocal: "asc" },
      select: {
        startTimeLocal: true,
        aerobicTrainingEffect: true,
        anaerobicTrainingEffect: true,
        distance: true,
        duration: true,
      },
    });

    const hrvValues = sleepData.map((s) => s.avgOvernightHRV!);
    const avg = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
    const min = Math.min(...hrvValues);
    const max = Math.max(...hrvValues);

    // Weekly averages
    const weeklyData: { week: string; avg: number; count: number }[] = [];
    const weekMap = new Map<string, number[]>();
    for (const s of sleepData) {
      const weekStart = new Date(s.calendarDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(s.avgOvernightHRV!);
    }
    for (const [week, values] of weekMap) {
      weeklyData.push({
        week,
        avg: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
        count: values.length,
      });
    }

    const hrvSummary = sleepData.map((s) => ({
      date: s.calendarDate.toISOString().split("T")[0],
      hrv: Math.round(s.avgOvernightHRV!),
      sleepScore: s.sleepScore,
      sleepHours: s.totalSleepSeconds ? +(s.totalSleepSeconds / 3600).toFixed(1) : null,
      restHR: s.restingHeartRate,
      stress: s.avgSleepStress ? Math.round(s.avgSleepStress) : null,
    }));

    const activitySummary = activities.map((a) => ({
      date: a.startTimeLocal.toISOString().split("T")[0],
      distanceKm: +(a.distance / 1000).toFixed(1),
      durationMin: +(a.duration / 60).toFixed(0),
      aerobicTE: a.aerobicTrainingEffect,
      anaerobicTE: a.anaerobicTrainingEffect,
    }));

    const periodStart = sleepData[0].calendarDate;
    const periodEnd = sleepData[sleepData.length - 1].calendarDate;

    const prompt = `## Statistiques HRV
- Période : ${periodStart.toLocaleDateString("fr-FR")} au ${periodEnd.toLocaleDateString("fr-FR")}
- Nombre de mesures : ${sleepData.length}
- Moyenne : ${avg.toFixed(1)} ms
- Minimum : ${min} ms
- Maximum : ${max} ms

## Moyennes hebdomadaires
${JSON.stringify(weeklyData, null, 2)}

## Données HRV détaillées (avec sommeil et stress)
${JSON.stringify(hrvSummary, null, 2)}

## Activités sur la période
${JSON.stringify(activitySummary, null, 2)}

## Profil coureur
- VO2max estimé : ${user.vo2max ?? "N/A"}
- FC repos : ${user.restingHR ?? "N/A"} bpm
- FC max : ${user.maxHR ?? "N/A"} bpm`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: HRV_ANALYSIS_PROMPT,
        temperature: 0.5,
      },
    });

    const analysis = response.text ?? "";

    // Cache the result
    await prisma.healthAnalysis.upsert({
      where: {
        userId_pageType: {
          userId: user.id,
          pageType: "hrv",
        },
      },
      update: {
        analysis,
        model: "gemini-3-flash-preview",
        periodStart,
        periodEnd,
        dataPointsCount: sleepData.length,
        createdAt: now,
      },
      create: {
        userId: user.id,
        pageType: "hrv",
        analysis,
        model: "gemini-3-flash-preview",
        periodStart,
        periodEnd,
        dataPointsCount: sleepData.length,
      },
    });

    return {
      analysis,
      createdAt: now,
      periodStart,
      periodEnd,
      dataPointsCount: sleepData.length,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error generating HRV analysis:", error);
    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
      error: error instanceof Error ? error.message : "Erreur d'analyse",
    };
  }
}

const STRESS_ANALYSIS_PROMPT = `Tu es un expert en gestion du stress et récupération sportive. Analyse les données de stress fournies.

Les données incluent :
- **Stress quotidien** : mesuré tout au long de la journée (0-100)
- **Stress nocturne** : mesuré pendant le sommeil (0-100)

Échelle de stress (0-100) :
- 0-25 : Repos/Bas (excellent pour la récupération)
- 26-50 : Bas/Modéré (normal, corps au calme)
- 51-75 : Modéré/Élevé (activité ou stress mental)
- 76-100 : Élevé/Très élevé (alerte, récupération compromise)

Fournis une analyse structurée couvrant :

1. **Vue d'ensemble** : Comparaison stress quotidien vs nocturne, niveau global de stress
2. **Patterns journaliers** : Différences semaine/weekend, jours plus stressants
3. **Qualité de récupération** : Le stress nocturne est clé pour la récupération - analyse son impact
4. **Corrélations entraînement** : Impact des séances intensives sur le stress des jours suivants
5. **Pics de stress** : Identification des jours anormaux, hypothèses explicatives
6. **Recommandations** : Conseils pratiques pour optimiser le stress et la récupération

Sois précis avec les chiffres. Contextualise par rapport à un coureur amateur/intermédiaire.
Réponds en français, de manière concise mais actionnable.`;

export async function fetchStressAnalysis(): Promise<HealthAnalysisResult> {
  try {
    const user = await getAuthenticatedUser();

    const cached = await prisma.healthAnalysis.findUnique({
      where: {
        userId_pageType: {
          userId: user.id,
          pageType: "stress",
        },
      },
    });

    if (cached) {
      return {
        analysis: cached.analysis,
        createdAt: cached.createdAt,
        periodStart: cached.periodStart,
        periodEnd: cached.periodEnd,
        dataPointsCount: cached.dataPointsCount,
      };
    }

    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error fetching stress analysis:", error);
    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}

export async function generateStressAnalysis(): Promise<HealthAnalysisResult> {
  try {
    const user = await getAuthenticatedUser();
    const ai = getAI();

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

    // Load stress data from both sources
    const [sleepData, healthData, activities] = await Promise.all([
      prisma.sleepRecord.findMany({
        where: {
          userId: user.id,
          calendarDate: { gte: ninetyDaysAgo },
        },
        orderBy: { calendarDate: "asc" },
      }),
      prisma.healthMetric.findMany({
        where: {
          userId: user.id,
          calendarDate: { gte: ninetyDaysAgo },
        },
        orderBy: { calendarDate: "asc" },
      }),
      prisma.activity.findMany({
        where: { userId: user.id, startTimeLocal: { gte: ninetyDaysAgo } },
        orderBy: { startTimeLocal: "asc" },
        select: {
          startTimeLocal: true,
          aerobicTrainingEffect: true,
          anaerobicTrainingEffect: true,
          distance: true,
          duration: true,
        },
      }),
    ]);

    const sleepWithStress = sleepData.filter((s) => s.avgSleepStress != null);
    const healthWithStress = healthData.filter((h) => h.stressLevel != null);

    if (sleepWithStress.length === 0 && healthWithStress.length === 0) {
      return {
        analysis: "",
        createdAt: null,
        periodStart: null,
        periodEnd: null,
        dataPointsCount: 0,
        error: "Aucune donnée de stress disponible. Synchronisez vos données Garmin.",
      };
    }

    // Sleep stress stats
    const sleepStressValues = sleepWithStress.map((s) => s.avgSleepStress!);
    const sleepAvg = sleepStressValues.length > 0
      ? sleepStressValues.reduce((a, b) => a + b, 0) / sleepStressValues.length
      : null;
    const sleepMin = sleepStressValues.length > 0 ? Math.min(...sleepStressValues) : null;
    const sleepMax = sleepStressValues.length > 0 ? Math.max(...sleepStressValues) : null;

    // Daily stress stats
    const dailyStressValues = healthWithStress.map((h) => h.stressLevel!);
    const dailyAvg = dailyStressValues.length > 0
      ? dailyStressValues.reduce((a, b) => a + b, 0) / dailyStressValues.length
      : null;
    const dailyMin = dailyStressValues.length > 0 ? Math.min(...dailyStressValues) : null;
    const dailyMax = dailyStressValues.length > 0 ? Math.max(...dailyStressValues) : null;

    // Combined daily summary
    const dateMap = new Map<string, {
      date: string;
      dayOfWeek: string;
      dailyStress: number | null;
      sleepStress: number | null;
      sleepScore: number | null;
      sleepHours: number | null;
      hrv: number | null;
    }>();

    for (const h of healthData) {
      const key = h.calendarDate.toISOString().split("T")[0];
      dateMap.set(key, {
        date: key,
        dayOfWeek: new Date(h.calendarDate).toLocaleDateString("fr-FR", { weekday: "short" }),
        dailyStress: h.stressLevel,
        sleepStress: null,
        sleepScore: null,
        sleepHours: null,
        hrv: null,
      });
    }

    for (const s of sleepData) {
      const key = s.calendarDate.toISOString().split("T")[0];
      const existing = dateMap.get(key);
      if (existing) {
        existing.sleepStress = s.avgSleepStress ? Math.round(s.avgSleepStress) : null;
        existing.sleepScore = s.sleepScore;
        existing.sleepHours = s.totalSleepSeconds ? +(s.totalSleepSeconds / 3600).toFixed(1) : null;
        existing.hrv = s.avgOvernightHRV ? Math.round(s.avgOvernightHRV) : null;
      } else {
        dateMap.set(key, {
          date: key,
          dayOfWeek: new Date(s.calendarDate).toLocaleDateString("fr-FR", { weekday: "short" }),
          dailyStress: null,
          sleepStress: s.avgSleepStress ? Math.round(s.avgSleepStress) : null,
          sleepScore: s.sleepScore,
          sleepHours: s.totalSleepSeconds ? +(s.totalSleepSeconds / 3600).toFixed(1) : null,
          hrv: s.avgOvernightHRV ? Math.round(s.avgOvernightHRV) : null,
        });
      }
    }

    const combinedSummary = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const activitySummary = activities.map((a) => ({
      date: a.startTimeLocal.toISOString().split("T")[0],
      distanceKm: +(a.distance / 1000).toFixed(1),
      durationMin: +(a.duration / 60).toFixed(0),
      aerobicTE: a.aerobicTrainingEffect,
      anaerobicTE: a.anaerobicTrainingEffect,
    }));

    // Determine period
    const allDates = [...sleepData.map(s => s.calendarDate), ...healthData.map(h => h.calendarDate)];
    const periodStart = new Date(Math.min(...allDates.map(d => d.getTime())));
    const periodEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDataPoints = sleepWithStress.length + healthWithStress.length;

    const prompt = `## Statistiques Stress Quotidien (journée)
- Nombre de mesures : ${healthWithStress.length}
- Moyenne : ${dailyAvg != null ? dailyAvg.toFixed(1) : "N/A"}
- Minimum : ${dailyMin ?? "N/A"}
- Maximum : ${dailyMax ?? "N/A"}

## Statistiques Stress Nocturne (sommeil)
- Nombre de mesures : ${sleepWithStress.length}
- Moyenne : ${sleepAvg != null ? sleepAvg.toFixed(1) : "N/A"}
- Minimum : ${sleepMin != null ? Math.round(sleepMin) : "N/A"}
- Maximum : ${sleepMax != null ? Math.round(sleepMax) : "N/A"}

## Période analysée
${periodStart.toLocaleDateString("fr-FR")} au ${periodEnd.toLocaleDateString("fr-FR")}

## Données combinées jour par jour
${JSON.stringify(combinedSummary, null, 2)}

## Activités sur la période
${JSON.stringify(activitySummary, null, 2)}

## Profil coureur
- VO2max estimé : ${user.vo2max ?? "N/A"}
- FC repos : ${user.restingHR ?? "N/A"} bpm
- FC max : ${user.maxHR ?? "N/A"} bpm`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: STRESS_ANALYSIS_PROMPT,
        temperature: 0.5,
      },
    });

    const analysis = response.text ?? "";

    await prisma.healthAnalysis.upsert({
      where: {
        userId_pageType: {
          userId: user.id,
          pageType: "stress",
        },
      },
      update: {
        analysis,
        model: "gemini-3-flash-preview",
        periodStart,
        periodEnd,
        dataPointsCount: totalDataPoints,
        createdAt: now,
      },
      create: {
        userId: user.id,
        pageType: "stress",
        analysis,
        model: "gemini-3-flash-preview",
        periodStart,
        periodEnd,
        dataPointsCount: totalDataPoints,
      },
    });

    return {
      analysis,
      createdAt: now,
      periodStart,
      periodEnd,
      dataPointsCount: totalDataPoints,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error generating stress analysis:", error);
    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
      error: error instanceof Error ? error.message : "Erreur d'analyse",
    };
  }
}

const SLEEP_ANALYSIS_PROMPT = `Tu es un expert en sommeil et récupération sportive. Analyse les données de sommeil fournies pour un coureur.

Fournis une analyse structurée couvrant :

1. **Durée et qualité** : Durée moyenne vs recommandations (7-9h pour un athlète), évolution du score de sommeil
2. **Architecture du sommeil** : Répartition sommeil profond/léger/REM, qualité de la récupération physiologique
3. **Régularité** : Analyse des heures de coucher et de réveil, constance du rythme circadien, écarts semaine/weekend
4. **Récupération physique** : Impact sur HRV, FC repos, Body Battery si disponible
5. **Corrélations entraînement** : Lien entre séances intenses et qualité du sommeil suivant
6. **Points d'attention** : Nuits problématiques, tendances négatives, réveils nocturnes excessifs
7. **Recommandations** : Conseils pratiques pour optimiser le sommeil (hygiène, régularité, pré-sommeil)

Sois précis avec les chiffres. Contextualise par rapport aux besoins d'un coureur amateur/intermédiaire.
Réponds en français, de manière concise mais actionnable.`;

export async function fetchSleepAnalysis(): Promise<HealthAnalysisResult> {
  try {
    const user = await getAuthenticatedUser();

    const cached = await prisma.healthAnalysis.findUnique({
      where: {
        userId_pageType: {
          userId: user.id,
          pageType: "sleep",
        },
      },
    });

    if (cached) {
      return {
        analysis: cached.analysis,
        createdAt: cached.createdAt,
        periodStart: cached.periodStart,
        periodEnd: cached.periodEnd,
        dataPointsCount: cached.dataPointsCount,
      };
    }

    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error fetching sleep analysis:", error);
    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}

export async function generateSleepAnalysis(): Promise<HealthAnalysisResult> {
  try {
    const user = await getAuthenticatedUser();
    const ai = getAI();

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

    // Load sleep data
    const [sleepData, activities] = await Promise.all([
      prisma.sleepRecord.findMany({
        where: {
          userId: user.id,
          calendarDate: { gte: ninetyDaysAgo },
        },
        orderBy: { calendarDate: "asc" },
      }),
      prisma.activity.findMany({
        where: { userId: user.id, startTimeLocal: { gte: ninetyDaysAgo } },
        orderBy: { startTimeLocal: "asc" },
        select: {
          startTimeLocal: true,
          aerobicTrainingEffect: true,
          anaerobicTrainingEffect: true,
          distance: true,
          duration: true,
        },
      }),
    ]);

    const withSleep = sleepData.filter((s) => s.totalSleepSeconds != null);

    if (withSleep.length === 0) {
      return {
        analysis: "",
        createdAt: null,
        periodStart: null,
        periodEnd: null,
        dataPointsCount: 0,
        error: "Aucune donnée de sommeil disponible. Synchronisez vos données Garmin.",
      };
    }

    // Sleep duration stats
    const durations = withSleep.map((s) => s.totalSleepSeconds!);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    // Sleep score stats
    const scores = withSleep.map((s) => s.sleepScore).filter((s): s is number => s != null);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Bedtime and wake time regularity
    // Garmin timestamps are "local" encoded as UTC, so use UTC methods
    const bedtimes: number[] = [];
    const waketimes: number[] = [];
    for (const s of withSleep) {
      if (s.sleepStartTimestamp) {
        const d = new Date(s.sleepStartTimestamp);
        let hours = d.getUTCHours() + d.getUTCMinutes() / 60;
        // Normalize bedtime (if after midnight, add 24 to keep it continuous)
        if (hours < 12) hours += 24;
        bedtimes.push(hours);
      }
      if (s.sleepEndTimestamp) {
        const d = new Date(s.sleepEndTimestamp);
        waketimes.push(d.getUTCHours() + d.getUTCMinutes() / 60);
      }
    }

    const avgBedtime = bedtimes.length > 0 ? bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length : null;
    const avgWaketime = waketimes.length > 0 ? waketimes.reduce((a, b) => a + b, 0) / waketimes.length : null;
    const bedtimeStdDev = bedtimes.length > 1
      ? Math.sqrt(bedtimes.map(x => Math.pow(x - avgBedtime!, 2)).reduce((a, b) => a + b) / bedtimes.length)
      : null;
    const waketimeStdDev = waketimes.length > 1
      ? Math.sqrt(waketimes.map(x => Math.pow(x - avgWaketime!, 2)).reduce((a, b) => a + b) / waketimes.length)
      : null;

    const formatTimeFromHours = (h: number): string => {
      const normalizedH = h >= 24 ? h - 24 : h;
      const hours = Math.floor(normalizedH);
      const mins = Math.round((normalizedH - hours) * 60);
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    // Weekly averages
    const weeklyData: { week: string; avgDuration: number; avgScore: number | null; count: number }[] = [];
    const weekMap = new Map<string, { durations: number[]; scores: number[] }>();
    for (const s of withSleep) {
      const weekStart = new Date(s.calendarDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!weekMap.has(key)) weekMap.set(key, { durations: [], scores: [] });
      const w = weekMap.get(key)!;
      w.durations.push(s.totalSleepSeconds!);
      if (s.sleepScore != null) w.scores.push(s.sleepScore);
    }
    for (const [week, { durations: d, scores: sc }] of weekMap) {
      weeklyData.push({
        week,
        avgDuration: +(d.reduce((a, b) => a + b, 0) / d.length / 3600).toFixed(1),
        avgScore: sc.length > 0 ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null,
        count: d.length,
      });
    }

    // Helper to format time from Garmin "local as UTC" timestamps
    const formatTimeUTC = (date: Date | null): string | null => {
      if (!date) return null;
      const d = new Date(date);
      return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
    };

    // Detailed sleep summary
    const sleepSummary = withSleep.map((s) => ({
      date: s.calendarDate.toISOString().split("T")[0],
      dayOfWeek: new Date(s.calendarDate).toLocaleDateString("fr-FR", { weekday: "short" }),
      durationHours: +(s.totalSleepSeconds! / 3600).toFixed(1),
      deepPct: s.deepSleepSeconds && s.totalSleepSeconds
        ? Math.round((s.deepSleepSeconds / s.totalSleepSeconds) * 100)
        : null,
      lightPct: s.lightSleepSeconds && s.totalSleepSeconds
        ? Math.round((s.lightSleepSeconds / s.totalSleepSeconds) * 100)
        : null,
      remPct: s.remSleepSeconds && s.totalSleepSeconds
        ? Math.round((s.remSleepSeconds / s.totalSleepSeconds) * 100)
        : null,
      awakePct: s.awakeSleepSeconds && s.totalSleepSeconds
        ? Math.round((s.awakeSleepSeconds / s.totalSleepSeconds) * 100)
        : null,
      score: s.sleepScore,
      bedtime: formatTimeUTC(s.sleepStartTimestamp),
      waketime: formatTimeUTC(s.sleepEndTimestamp),
      hrv: s.avgOvernightHRV ? Math.round(s.avgOvernightHRV) : null,
      restHR: s.restingHeartRate,
      stress: s.avgSleepStress ? Math.round(s.avgSleepStress) : null,
    }));

    const activitySummary = activities.map((a) => ({
      date: a.startTimeLocal.toISOString().split("T")[0],
      distanceKm: +(a.distance / 1000).toFixed(1),
      durationMin: +(a.duration / 60).toFixed(0),
      aerobicTE: a.aerobicTrainingEffect,
      anaerobicTE: a.anaerobicTrainingEffect,
    }));

    const periodStart = withSleep[0].calendarDate;
    const periodEnd = withSleep[withSleep.length - 1].calendarDate;

    const prompt = `## Statistiques globales
- Période : ${periodStart.toLocaleDateString("fr-FR")} au ${periodEnd.toLocaleDateString("fr-FR")}
- Nombre de nuits : ${withSleep.length}
- Durée moyenne : ${(avgDuration / 3600).toFixed(1)}h
- Durée min/max : ${(minDuration / 3600).toFixed(1)}h / ${(maxDuration / 3600).toFixed(1)}h
- Score moyen : ${avgScore != null ? avgScore.toFixed(0) : "N/A"}/100

## Régularité des horaires
- Heure de coucher moyenne : ${avgBedtime != null ? formatTimeFromHours(avgBedtime) : "N/A"}
- Écart-type coucher : ${bedtimeStdDev != null ? (bedtimeStdDev * 60).toFixed(0) + " min" : "N/A"}
- Heure de réveil moyenne : ${avgWaketime != null ? formatTimeFromHours(avgWaketime) : "N/A"}
- Écart-type réveil : ${waketimeStdDev != null ? (waketimeStdDev * 60).toFixed(0) + " min" : "N/A"}

## Moyennes hebdomadaires
${JSON.stringify(weeklyData, null, 2)}

## Données de sommeil détaillées
${JSON.stringify(sleepSummary, null, 2)}

## Activités sur la période
${JSON.stringify(activitySummary, null, 2)}

## Profil coureur
- VO2max estimé : ${user.vo2max ?? "N/A"}
- FC repos : ${user.restingHR ?? "N/A"} bpm
- FC max : ${user.maxHR ?? "N/A"} bpm`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SLEEP_ANALYSIS_PROMPT,
        temperature: 0.5,
      },
    });

    const analysis = response.text ?? "";

    await prisma.healthAnalysis.upsert({
      where: {
        userId_pageType: {
          userId: user.id,
          pageType: "sleep",
        },
      },
      update: {
        analysis,
        model: "gemini-3-flash-preview",
        periodStart,
        periodEnd,
        dataPointsCount: withSleep.length,
        createdAt: now,
      },
      create: {
        userId: user.id,
        pageType: "sleep",
        analysis,
        model: "gemini-3-flash-preview",
        periodStart,
        periodEnd,
        dataPointsCount: withSleep.length,
      },
    });

    return {
      analysis,
      createdAt: now,
      periodStart,
      periodEnd,
      dataPointsCount: withSleep.length,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error generating sleep analysis:", error);
    return {
      analysis: "",
      createdAt: null,
      periodStart: null,
      periodEnd: null,
      dataPointsCount: 0,
      error: error instanceof Error ? error.message : "Erreur d'analyse",
    };
  }
}
