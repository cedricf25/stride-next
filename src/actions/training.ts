"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";

// ============================================================================
// TRAINING PLAN TYPES
// ============================================================================

export interface TrainingPlanInput {
  raceType: string;
  raceDate?: string;
  startDate?: string;
  targetDistance?: number;
  targetElevation?: number;
  targetTime?: string;
  trainingDays: string[];
  longRunDay: string;
  planningMode: "time" | "distance";
  includeStrength?: boolean;
  strengthFrequency?: number;
}

// ============================================================================
// TRAINING PLAN CORE OPERATIONS
// ============================================================================

export async function fetchTrainingPlans() {
  const user = await getAuthenticatedUser();

  return prisma.trainingPlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      weeks: {
        include: { sessions: true },
        orderBy: { weekNumber: "asc" },
      },
    },
  });
}

export async function fetchTrainingPlan(planId: string) {
  return prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        include: {
          sessions: {
            include: {
              linkedActivity: {
                select: {
                  id: true,
                  activityName: true,
                  distance: true,
                  duration: true,
                  averageSpeed: true,
                  averageHR: true,
                  startTimeLocal: true,
                },
              },
            },
          },
        },
        orderBy: { weekNumber: "asc" },
      },
    },
  });
}

export async function toggleSessionCompleted(sessionId: string) {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return;

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { completed: !session.completed },
  });
}

export async function fetchNextSession() {
  const user = await getAuthenticatedUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Récupérer les plans actifs avec leurs semaines et sessions
  const plans = await prisma.trainingPlan.findMany({
    where: { userId: user.id, status: "active" },
    include: {
      weeks: {
        include: { sessions: true },
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  if (plans.length === 0) return null;

  // Mapping jour de la semaine français → numéro (lundi = 1, dimanche = 7)
  const dayMap: Record<string, number> = {
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
    dimanche: 7,
  };

  function calcSessionDate(planStartDate: Date, weekNumber: number, dayOfWeek: string): Date {
    const dayNum = dayMap[dayOfWeek.toLowerCase()] ?? 1;
    const date = new Date(planStartDate);
    const startDayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const daysToAdd = (weekNumber - 1) * 7 + (dayNum - startDayOfWeek);
    date.setDate(date.getDate() + daysToAdd);
    return date;
  }

  type NextSessionResult = {
    session: {
      id: string;
      dayOfWeek: string;
      sessionType: string;
      title: string;
      description: string;
      distance: number | null;
      duration: number | null;
      targetPace: string | null;
      targetHRZone: string | null;
      intensity: string;
      workoutSummary: string | null;
    };
    plan: {
      id: string;
      name: string;
      raceType: string;
      planningMode: string;
    };
    weekNumber: number;
    sessionDate: Date;
  };

  let nextSession: NextSessionResult | null = null;
  let nextDate: Date | null = null;

  for (const plan of plans) {
    if (!plan.startDate) continue;

    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        // Ignorer les séances complétées et les jours de repos
        if (session.completed || session.sessionType === "rest") continue;

        const sessionDate = calcSessionDate(plan.startDate, week.weekNumber, session.dayOfWeek);
        sessionDate.setHours(0, 0, 0, 0);

        // Séance dans le futur ou aujourd'hui
        if (sessionDate >= today) {
          if (!nextDate || sessionDate < nextDate) {
            nextDate = sessionDate;
            nextSession = {
              session: {
                id: session.id,
                dayOfWeek: session.dayOfWeek,
                sessionType: session.sessionType,
                title: session.title,
                description: session.description,
                distance: session.distance,
                duration: session.duration,
                targetPace: session.targetPace,
                targetHRZone: session.targetHRZone,
                intensity: session.intensity,
                workoutSummary: session.workoutSummary,
              },
              plan: {
                id: plan.id,
                name: plan.name,
                raceType: plan.raceType,
                planningMode: plan.planningMode,
              },
              weekNumber: week.weekNumber,
              sessionDate,
            };
          }
        }
      }
    }
  }

  return nextSession;
}

export async function fetchPaceZones() {
  const user = await getAuthenticatedUser();

  // VO2max depuis le profil ou la dernière activité
  let vo2max = user.vo2max;
  if (!vo2max) {
    const recent = await prisma.activity.findFirst({
      where: { userId: user.id, vo2max: { not: null } },
      orderBy: { startTimeLocal: "desc" },
    });
    vo2max = recent?.vo2max ?? null;
  }
  if (!vo2max) return null;

  // VMA (km/h) ≈ VO2max / 3.5 (Léger)
  const vmaKmh = vo2max / 3.5;

  function paceFromPercent(pct: number): string {
    const speed = vmaKmh * pct;
    const secPerKm = 3600 / speed;
    const min = Math.floor(secPerKm / 60);
    const sec = Math.round(secPerKm % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  return {
    vo2max: +vo2max.toFixed(1),
    vmaKmh: +vmaKmh.toFixed(1),
    zones: {
      vma: { label: "VMA", range: `${paceFromPercent(1.05)} - ${paceFromPercent(0.95)}`, pctVma: "95-105%", color: "red" as const },
      seuil: { label: "Seuil", range: `${paceFromPercent(0.90)} - ${paceFromPercent(0.85)}`, pctVma: "85-90%", color: "orange" as const },
      tempo: { label: "Tempo", range: `${paceFromPercent(0.85)} - ${paceFromPercent(0.80)}`, pctVma: "80-85%", color: "yellow" as const },
      ef: { label: "End. fond.", range: `${paceFromPercent(0.75)} - ${paceFromPercent(0.60)}`, pctVma: "60-75%", color: "green" as const },
    },
  };
}

export async function deleteTrainingPlan(planId: string) {
  await prisma.trainingPlan.delete({ where: { id: planId } });
}

// ============================================================================
// ACTIVITY-PLAN MATCHING
// ============================================================================

// Mapping jour de la semaine français → numéro (lundi = 1, dimanche = 7)
const dayOfWeekMap: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

// Mapping type de séance → types d'activité compatibles
const sessionTypeCompatibility: Record<string, string[]> = {
  easy: ["running", "trail_running", "track_running"],
  recovery: ["running", "trail_running", "track_running"],
  tempo: ["running", "trail_running", "track_running"],
  interval: ["running", "trail_running", "track_running"],
  long_run: ["running", "trail_running", "track_running"],
  rest: [], // pas de matching pour les jours de repos
};

function getSessionDate(
  planStartDate: Date,
  weekNumber: number,
  dayOfWeek: string
): Date {
  const dayNum = dayOfWeekMap[dayOfWeek.toLowerCase()] ?? 1;
  const date = new Date(planStartDate);
  // Semaine 1 commence à planStartDate, on ajuste au bon jour
  const startDayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // getDay: 0=dim, 1=lun...
  const daysToAdd = (weekNumber - 1) * 7 + (dayNum - startDayOfWeek);
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

function isSameDay(d1: Date, d2: Date): boolean {
  // Comparer les dates en format local YYYY-MM-DD pour éviter les décalages de timezone
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return toLocalDateStr(d1) === toLocalDateStr(d2);
}

function computeMatchScore(
  activity: {
    distance: number;
    duration: number;
    activityType: string;
    aerobicTrainingEffect: number | null;
    anaerobicTrainingEffect: number | null;
  },
  session: {
    sessionType: string;
    distance: number | null;
    duration: number | null;
  }
): number {
  let score = 0;

  // 1. Type compatible ? (30 points)
  const compatibleTypes = sessionTypeCompatibility[session.sessionType] ?? [];
  if (compatibleTypes.length === 0) return 0; // rest day
  if (!compatibleTypes.includes(activity.activityType)) return 0;
  score += 30;

  // 2. Distance proche ? (35 points max)
  if (session.distance && session.distance > 0) {
    const activityDistanceKm = activity.distance / 1000;
    const ratio = activityDistanceKm / session.distance;
    // Écart de 0% = 35 points, écart de 50% = 0 points
    score += Math.max(0, 35 - Math.abs(1 - ratio) * 70);
  } else {
    // Pas de distance planifiée, on donne des points par défaut
    score += 20;
  }

  // 3. Durée proche ? (35 points max)
  if (session.duration && session.duration > 0) {
    const activityDurationMin = activity.duration / 60;
    const ratio = activityDurationMin / session.duration;
    // Écart de 0% = 35 points, écart de 50% = 0 points
    score += Math.max(0, 35 - Math.abs(1 - ratio) * 70);
  } else {
    // Pas de durée planifiée, on donne des points par défaut
    score += 20;
  }

  return Math.min(100, Math.round(score));
}

export async function matchActivitiesToPlans() {
  const user = await getAuthenticatedUser();

  // Récupérer tous les plans actifs avec leurs sessions
  const plans = await prisma.trainingPlan.findMany({
    where: { userId: user.id, status: "active" },
    include: {
      weeks: {
        include: { sessions: true },
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  if (plans.length === 0) return { matched: 0 };

  // Récupérer toutes les activités de l'utilisateur (non encore liées)
  const activities = await prisma.activity.findMany({
    where: {
      userId: user.id,
      linkedSession: { is: null }, // pas encore liée (syntaxe Prisma correcte)
    },
    orderBy: { startTimeLocal: "asc" },
  });

  let matchedCount = 0;

  for (const plan of plans) {
    if (!plan.startDate) continue;

    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        // Skip si déjà liée ou jour de repos
        if (session.linkedActivityId) continue;
        if (session.sessionType === "rest") continue;

        // Calculer la date de cette séance
        const sessionDate = getSessionDate(
          plan.startDate,
          week.weekNumber,
          session.dayOfWeek
        );

        // Trouver les activités du même jour
        const sameDayActivities = activities.filter((a) =>
          isSameDay(a.startTimeLocal, sessionDate)
        );

        if (sameDayActivities.length === 0) continue;

        // Calculer le score pour chaque activité et prendre la meilleure
        let bestMatch: { activity: (typeof activities)[0]; score: number } | null = null;

        for (const activity of sameDayActivities) {
          const score = computeMatchScore(activity, session);
          if (score >= 50 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { activity, score };
          }
        }

        if (bestMatch) {
          // Lier l'activité à la session
          await prisma.trainingSession.update({
            where: { id: session.id },
            data: {
              linkedActivityId: bestMatch.activity.id,
              matchScore: bestMatch.score,
              completed: true,
            },
          });

          // Retirer cette activité de la liste pour ne pas la lier plusieurs fois
          const idx = activities.findIndex((a) => a.id === bestMatch!.activity.id);
          if (idx !== -1) activities.splice(idx, 1);

          matchedCount++;
        }
      }
    }
  }

  return { matched: matchedCount };
}

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

export async function updateSessionDisplayMode(
  sessionId: string,
  displayMode: "time" | "distance" | null
) {
  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { displayMode },
  });
}

/**
 * Réordonne les séances d'une semaine selon l'ordre fourni.
 * Réassigne les jours de la semaine pour correspondre aux positions.
 * @param sessionIds - IDs des séances dans le nouvel ordre souhaité
 * @param dayMapping - mapping sessionId → nouveau dayOfWeek
 */
export async function reorderSessions(sessionIds: string[], dayMapping: Record<string, string>) {
  const updates = sessionIds.map((id, index) =>
    prisma.trainingSession.update({
      where: { id },
      data: {
        sortOrder: index,
        dayOfWeek: dayMapping[id],
      },
    })
  );
  await Promise.all(updates);
}
