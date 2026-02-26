"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";

export async function fetchLatestHealthSummary() {
  const user = await getAuthenticatedUser();

  const [latestSleep, latestHealth] = await Promise.all([
    prisma.sleepRecord.findFirst({
      where: { userId: user.id },
      orderBy: { calendarDate: "desc" },
    }),
    prisma.healthMetric.findFirst({
      where: { userId: user.id },
      orderBy: { calendarDate: "desc" },
    }),
  ]);

  return {
    sleep: latestSleep
      ? {
          score: latestSleep.sleepScore,
          totalHours: latestSleep.totalSleepSeconds
            ? +(latestSleep.totalSleepSeconds / 3600).toFixed(1)
            : null,
          qualifier: latestSleep.sleepQualifier,
        }
      : null,
    health: latestHealth
      ? {
          restingHR: latestHealth.restingHeartRate,
          weight: latestHealth.weight ? +latestHealth.weight.toFixed(1) : null,
          steps: latestHealth.totalSteps,
        }
      : null,
  };
}

export async function fetchSleepHistory(days: number = 30) {
  const user = await getAuthenticatedUser();

  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.sleepRecord.findMany({
    where: {
      userId: user.id,
      calendarDate: { gte: since },
    },
    orderBy: { calendarDate: "asc" },
  });
}

export async function fetchHealthHistory(days: number = 30) {
  const user = await getAuthenticatedUser();

  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.healthMetric.findMany({
    where: {
      userId: user.id,
      calendarDate: { gte: since },
    },
    orderBy: { calendarDate: "asc" },
  });
}

export interface FatigueDayData {
  date: string; // YYYY-MM-DD
  label: string; // "20 fév"
  trainingLoad: number; // sum of TE for the day
  restingHR: number | null;
  hrv: number | null;
  sleepScore: number | null;
  fatigueScore: number; // 0-100 (0 = frais, 100 = épuisé)
}

export interface FatigueTrendData {
  days: FatigueDayData[];
  currentFatigue: number;
  trend: "rising" | "stable" | "declining";
  message: string;
}

export interface TrainingIntensityData {
  // Période analysée
  periodStart: string;
  periodEnd: string;
  // Minutes totales sur la période
  anaerobic: number;       // Minutes très intenses (vigoureuses x2)
  aerobicHigh: number;     // Minutes vigoureuses
  aerobicLow: number;      // Minutes modérées
  // Plages optimales (recommandations OMS : 150-300 min modérées ou 75-150 vigoureuses/semaine)
  optimalMin: number;
  optimalMax: number;
  // Message et statut
  status: "low" | "optimal" | "high";
  statusLabel: string;     // Titre affiché (ex: "Manque d'anaérobie")
  message: string;
}

export async function fetchTrainingIntensity(
  days: number = 28
): Promise<TrainingIntensityData> {
  const user = await getAuthenticatedUser();
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Récupérer les activités pour calculer les minutes d'intensité basées sur Training Effect
  const activities = await prisma.activity.findMany({
    where: {
      userId: user.id,
      startTimeLocal: { gte: since },
    },
    select: {
      duration: true,
      aerobicTrainingEffect: true,
      anaerobicTrainingEffect: true,
    },
  });

  // Calculer les minutes par catégorie basées sur Training Effect
  // Garmin utilise le TE pour pondérer les minutes d'activité
  let anaerobic = 0;
  let aerobicHigh = 0;
  let aerobicLow = 0;

  for (const activity of activities) {
    const durationMin = (activity.duration ?? 0) / 60;
    const aerobicTE = activity.aerobicTrainingEffect ?? 0;
    const anaerobicTE = activity.anaerobicTrainingEffect ?? 0;

    // Coefficients calibrés sur les valeurs Garmin réelles
    // Minutes anaérobies : pondérées par anaerobicTE
    anaerobic += Math.round(durationMin * (anaerobicTE / 2));

    // Minutes aérobie élevée : aerobicTE >= 2.5 (intensité élevée)
    if (aerobicTE >= 2.5) {
      aerobicHigh += Math.round(durationMin * aerobicTE * 0.48);
    }

    // Minutes aérobie faible : toute activité avec aerobicTE > 0
    if (aerobicTE >= 1) {
      aerobicLow += Math.round(durationMin * aerobicTE * 0.2);
    }
  }

  let status: "low" | "optimal" | "high";
  let statusLabel: string;
  let message: string;

  // Déterminer si chaque catégorie est dans sa plage optimale
  // Garmin semble avoir un seuil anaérobie plus élevé (~250+ pour être "ok")
  const anaerobicLow = anaerobic < 250;
  const anaerobicHigh = anaerobic > 500;
  const aerobicHighLow = aerobicHigh < 800;
  const aerobicHighHigh = aerobicHigh > 1600;
  const aerobicLowLow = aerobicLow < 400;
  const aerobicLowHigh = aerobicLow > 900;

  // Calculer le statut global basé sur les catégories
  const hasDeficit = anaerobicLow || aerobicHighLow || aerobicLowLow;
  const hasExcess = anaerobicHigh || aerobicHighHigh || aerobicLowHigh;

  if (hasExcess && !hasDeficit) {
    status = "high";
    statusLabel = "Volume élevé";
    message = "Volume très élevé. Surveillez la récupération.";
  } else if (hasDeficit) {
    status = "low";
    // Identifier le déficit principal (priorité : anaérobie > aérobie élevée > aérobie faible)
    if (anaerobicLow) {
      statusLabel = "Manque d'anaérobie";
      message = "Vos entraînements manquent de quelques activités anaérobies très intenses. Celles-ci augmenteront votre vitesse et votre capacité anaérobie au fil du temps.";
    } else if (aerobicHighLow) {
      statusLabel = "Manque d'aérobie élevée";
      message = "Ajoutez des séances tempo ou seuil pour développer votre endurance à haute intensité.";
    } else {
      statusLabel = "Manque d'activité";
      message = "Augmentez progressivement le volume de vos entraînements.";
    }
  } else {
    status = "optimal";
    statusLabel = "Bon équilibre";
    message = "Bon équilibre d'intensité. Continuez ainsi.";
  }

  // Plages globales pour l'interface (non utilisées pour le calcul)
  const optimalMin = 600;
  const optimalMax = 1200;

  return {
    periodStart: since.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    periodEnd: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    anaerobic,
    aerobicHigh,
    aerobicLow,
    optimalMin,
    optimalMax,
    status,
    statusLabel,
    message,
  };
}

export async function fetchFatigueTrend(
  days: number = 14
): Promise<FatigueTrendData> {
  const user = await getAuthenticatedUser();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [activities, sleepRecords, healthMetrics] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: user.id, startTimeLocal: { gte: since } },
      orderBy: { startTimeLocal: "asc" },
    }),
    prisma.sleepRecord.findMany({
      where: { userId: user.id, calendarDate: { gte: since } },
      orderBy: { calendarDate: "asc" },
    }),
    prisma.healthMetric.findMany({
      where: { userId: user.id, calendarDate: { gte: since } },
      orderBy: { calendarDate: "asc" },
    }),
  ]);

  // Indexer par date
  const sleepByDate = new Map(
    sleepRecords.map((s) => [
      s.calendarDate.toISOString().split("T")[0],
      s,
    ])
  );
  const healthByDate = new Map(
    healthMetrics.map((h) => [
      h.calendarDate.toISOString().split("T")[0],
      h,
    ])
  );

  // Charge d'entraînement par jour (somme des TE)
  const loadByDate = new Map<string, number>();
  for (const a of activities) {
    const d = a.startTimeLocal.toISOString().split("T")[0];
    loadByDate.set(d, (loadByDate.get(d) ?? 0) + (a.aerobicTrainingEffect ?? 0));
  }

  // Construire les données jour par jour
  const result: FatigueDayData[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    if (date > now) break;

    const key = date.toISOString().split("T")[0];
    const sleep = sleepByDate.get(key);
    const health = healthByDate.get(key);
    const trainingLoad = loadByDate.get(key) ?? 0;

    // Score de fatigue heuristique :
    // - Charge TE élevée → fatigue monte
    // - FC repos élevée → fatigue monte
    // - HRV basse → fatigue monte
    // - Sommeil bas → fatigue monte
    let fatigueScore = 0;
    let factors = 0;

    // Training load (TE > 3 = intense, > 4 = très dur)
    if (trainingLoad > 0) {
      fatigueScore += Math.min(trainingLoad / 5, 1) * 100;
      factors++;
    }

    // FC repos (normalisée : 50bpm = bon, 70+ = fatigué)
    if (health?.restingHeartRate) {
      const hrScore = Math.min(
        Math.max((health.restingHeartRate - 45) / 30, 0),
        1
      ) * 100;
      fatigueScore += hrScore;
      factors++;
    }

    // HRV (normalisée inversée : 80+ = bon, 20 = fatigué)
    if (sleep?.avgOvernightHRV) {
      const hrvScore =
        (1 - Math.min(Math.max((sleep.avgOvernightHRV - 20) / 80, 0), 1)) * 100;
      fatigueScore += hrvScore;
      factors++;
    }

    // Sommeil (score /100 inversé)
    if (sleep?.sleepScore) {
      fatigueScore += (100 - sleep.sleepScore);
      factors++;
    }

    const avgFatigue = factors > 0 ? Math.round(fatigueScore / factors) : 0;

    result.push({
      date: key,
      label: date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      trainingLoad: +trainingLoad.toFixed(1),
      restingHR: health?.restingHeartRate ?? null,
      hrv: sleep?.avgOvernightHRV ? +sleep.avgOvernightHRV.toFixed(0) : null,
      sleepScore: sleep?.sleepScore ?? null,
      fatigueScore: avgFatigue,
    });
  }

  // Tendance sur les 5 derniers jours vs les 5 précédents
  const recent = result.slice(-5);
  const previous = result.slice(-10, -5);
  const avgRecent =
    recent.length > 0
      ? recent.reduce((s, d) => s + d.fatigueScore, 0) / recent.length
      : 0;
  const avgPrevious =
    previous.length > 0
      ? previous.reduce((s, d) => s + d.fatigueScore, 0) / previous.length
      : 0;

  const diff = avgRecent - avgPrevious;
  let trend: "rising" | "stable" | "declining";
  let message: string;

  if (diff > 8) {
    trend = "rising";
    message =
      "Fatigue en hausse. Envisage un jour de repos ou une séance légère.";
  } else if (diff < -8) {
    trend = "declining";
    message = "Bonne récupération. Tu es en forme pour intensifier.";
  } else {
    trend = "stable";
    message = "Charge stable. Continue sur ce rythme.";
  }

  return {
    days: result,
    currentFatigue: Math.round(avgRecent),
    trend,
    message,
  };
}
