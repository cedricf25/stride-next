"use server";

import { prisma } from "@/lib/prisma";
import type {
  PlanSnapshot,
  SessionSnapshot,
  VersionDiff,
  VersionSummary,
} from "@/types/training-version";

// Helper pour retry avec backoff exponentiel
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ============================================================================
// VERSIONING FUNCTIONS
// ============================================================================

const VERSION_RETENTION = {
  MAX_VERSIONS_PER_PLAN: 10,
  KEEP_LATEST_N: 5,
  MIN_AGE_FOR_CLEANUP_DAYS: 30,
};

export async function createPlanSnapshot(
  planId: string,
  triggerReason: "initial" | "manual_update" | "backfill"
): Promise<{ versionId: string; versionNumber: number }> {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        include: { sessions: true },
        orderBy: { weekNumber: "asc" },
      },
    },
  });
  if (!plan) throw new Error("Plan introuvable");

  // Check if this version already exists (e.g., created during initial generation)
  const existingVersion = await prisma.trainingPlanVersion.findUnique({
    where: { planId_versionNumber: { planId, versionNumber: plan.currentVersion } },
  });

  if (existingVersion) {
    // Version already exists, return it without creating a duplicate
    return { versionId: existingVersion.id, versionNumber: plan.currentVersion };
  }

  const snapshot: PlanSnapshot = {
    versionNumber: plan.currentVersion,
    createdAt: new Date().toISOString(),
    goalProbability: plan.goalProbability,
    goalAssessment: plan.goalAssessment,
    weeks: plan.weeks.map((w) => ({
      weekNumber: w.weekNumber,
      theme: w.theme,
      totalVolume: w.totalVolume,
      sessions: w.sessions.map((s) => ({
        sortOrder: s.sortOrder,
        dayOfWeek: s.dayOfWeek,
        sessionType: s.sessionType,
        title: s.title,
        description: s.description,
        distance: s.distance,
        duration: s.duration,
        targetPace: s.targetPace,
        targetHRZone: s.targetHRZone,
        intensity: s.intensity,
        workoutSummary: s.workoutSummary,
        elevationGain: s.elevationGain,
        terrainType: s.terrainType,
        exercises: s.exercises,
      })),
    })),
  };

  const version = await prisma.trainingPlanVersion.create({
    data: {
      planId,
      versionNumber: plan.currentVersion,
      snapshot: JSON.stringify(snapshot),
      triggerReason,
    },
  });

  return { versionId: version.id, versionNumber: plan.currentVersion };
}

// Tolerances for session comparison to avoid flagging minor changes
const DIFF_TOLERANCES = {
  duration: 5, // ±5 minutes
  distance: 0.5, // ±0.5 km
  paceSeconds: 10, // ±10 sec/km
};

function parsePaceToSeconds(pace: string | null): number | null {
  if (!pace) return null;
  const match = pace.match(/(\d+):(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function isWithinTolerance(
  field: string,
  before: unknown,
  after: unknown
): boolean {
  // Duration tolerance: ±5 minutes
  if (field === "duration") {
    const beforeVal = before as number | null;
    const afterVal = after as number | null;
    if (beforeVal === null && afterVal === null) return true;
    if (beforeVal === null || afterVal === null) return false;
    return Math.abs(beforeVal - afterVal) <= DIFF_TOLERANCES.duration;
  }

  // Distance tolerance: ±0.5 km
  if (field === "distance") {
    const beforeVal = before as number | null;
    const afterVal = after as number | null;
    if (beforeVal === null && afterVal === null) return true;
    if (beforeVal === null || afterVal === null) return false;
    return Math.abs(beforeVal - afterVal) <= DIFF_TOLERANCES.distance;
  }

  // Pace tolerance: ±10 sec/km
  if (field === "targetPace") {
    const beforeSec = parsePaceToSeconds(before as string | null);
    const afterSec = parsePaceToSeconds(after as string | null);
    if (beforeSec === null && afterSec === null) return true;
    if (beforeSec === null || afterSec === null) return false;
    return Math.abs(beforeSec - afterSec) <= DIFF_TOLERANCES.paceSeconds;
  }

  return false;
}

// Champs optionnels où les changements null ↔ valeur ne sont pas significatifs
// (l'IA remplit ou non ces champs selon les régénérations, ce n'est pas une vraie modification)
const OPTIONAL_FIELDS = new Set([
  "distance",
  "duration",
  "targetPace",
  "targetHRZone",
  "workoutSummary",
]);

// Champs texte souvent reformulés par l'IA - on les ignore pour la détection de modifications
// (l'IA génère des variations mineures dans la description/titre entre versions)
const IGNORED_TEXT_FIELDS = new Set([
  "description",
  "title",
]);

function compareSession(
  before: SessionSnapshot,
  after: SessionSnapshot
): { field: string; before: unknown; after: unknown }[] {
  const changes: { field: string; before: unknown; after: unknown }[] = [];
  const fields: (keyof SessionSnapshot)[] = [
    "sessionType",
    "title",
    "description",
    "distance",
    "duration",
    "targetPace",
    "targetHRZone",
    "intensity",
    "workoutSummary",
  ];

  for (const field of fields) {
    // Skip changeReason field - it's metadata, not content
    if (field === "changeReason") continue;

    // Ignorer les champs texte souvent reformulés par l'IA
    if (IGNORED_TEXT_FIELDS.has(field)) continue;

    if (before[field] !== after[field]) {
      // Apply tolerance for numeric/pace fields
      if (isWithinTolerance(field, before[field], after[field])) {
        continue; // Within tolerance, skip this change
      }

      // Ignorer les changements null ↔ valeur pour les champs optionnels
      if (OPTIONAL_FIELDS.has(field)) {
        if (before[field] == null || after[field] == null) {
          continue; // Un des deux est null, pas un vrai changement
        }
      }

      changes.push({ field, before: before[field], after: after[field] });
    }
  }

  return changes;
}

export function computeVersionDiff(
  oldSnapshot: PlanSnapshot,
  newSnapshot: PlanSnapshot
): VersionDiff {
  const diff: VersionDiff = {
    sessionsAdded: 0,
    sessionsRemoved: 0,
    sessionsModified: 0,
    volumeChange: 0,
    details: [],
  };

  const oldVolume = oldSnapshot.weeks.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0);
  const newVolume = newSnapshot.weeks.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0);
  diff.volumeChange = newVolume - oldVolume;

  const oldSessions = new Map<string, { week: number; session: SessionSnapshot }>();
  const newSessions = new Map<string, { week: number; session: SessionSnapshot }>();

  for (const week of oldSnapshot.weeks) {
    for (const session of week.sessions) {
      const key = `${week.weekNumber}-${session.dayOfWeek}`;
      oldSessions.set(key, { week: week.weekNumber, session });
    }
  }

  for (const week of newSnapshot.weeks) {
    for (const session of week.sessions) {
      const key = `${week.weekNumber}-${session.dayOfWeek}`;
      newSessions.set(key, { week: week.weekNumber, session });
    }
  }

  for (const [key, { week, session }] of newSessions) {
    const old = oldSessions.get(key);
    if (!old) {
      diff.sessionsAdded++;
      diff.details.push({
        weekNumber: week,
        dayOfWeek: session.dayOfWeek,
        changeType: "added",
        after: session,
        changeReason: session.changeReason,
      });
    } else {
      const changes = compareSession(old.session, session);
      if (changes.length > 0) {
        diff.sessionsModified++;
        diff.details.push({
          weekNumber: week,
          dayOfWeek: session.dayOfWeek,
          changeType: "modified",
          before: old.session,
          after: session,
          changes,
          changeReason: session.changeReason,
        });
      }
      oldSessions.delete(key);
    }
  }

  // Index des raisons de suppression explicites
  const deletionReasons = new Map<string, string>();
  if (newSnapshot.deletedSessions) {
    for (const del of newSnapshot.deletedSessions) {
      const key = `${del.weekNumber}-${del.dayOfWeek.toLowerCase()}`;
      deletionReasons.set(key, del.reason);
    }
  }

  for (const [, { week, session }] of oldSessions) {
    diff.sessionsRemoved++;
    const normalizedKey = `${week}-${session.dayOfWeek.toLowerCase()}`;
    const explicitReason = deletionReasons.get(normalizedKey);
    diff.details.push({
      weekNumber: week,
      dayOfWeek: session.dayOfWeek,
      changeType: "removed",
      before: session,
      changeReason: explicitReason ?? "Supprimé du plan (sans justification)",
    });
  }

  return diff;
}

export async function cleanupOldVersions(planId: string) {
  const { MAX_VERSIONS_PER_PLAN, KEEP_LATEST_N, MIN_AGE_FOR_CLEANUP_DAYS } = VERSION_RETENTION;

  const versions = await prisma.trainingPlanVersion.findMany({
    where: { planId },
    orderBy: { versionNumber: "desc" },
  });

  if (versions.length <= MAX_VERSIONS_PER_PLAN) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MIN_AGE_FOR_CLEANUP_DAYS);

  const toDelete = versions
    .slice(KEEP_LATEST_N)
    .filter((v: { createdAt: Date }) => v.createdAt < cutoffDate)
    .slice(0, versions.length - MAX_VERSIONS_PER_PLAN);

  if (toDelete.length > 0) {
    await prisma.trainingPlanVersion.deleteMany({
      where: { id: { in: toDelete.map((v: { id: string }) => v.id) } },
    });
  }
}

export async function fetchPlanVersions(planId: string): Promise<VersionSummary[]> {
  const versions = await prisma.trainingPlanVersion.findMany({
    where: { planId },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      createdAt: true,
      triggerReason: true,
      changelogSummary: true,
      sessionsAdded: true,
      sessionsRemoved: true,
      sessionsModified: true,
      volumeChange: true,
    },
  });
  return versions;
}

export async function fetchPlanVersion(versionId: string) {
  return prisma.trainingPlanVersion.findUnique({
    where: { id: versionId },
  });
}

export async function comparePlanVersions(
  planId: string,
  versionA: number,
  versionB: number
) {
  // Récupérer le plan pour connaître la date de début
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: { startDate: true },
  });

  const [a, b] = await Promise.all([
    prisma.trainingPlanVersion.findUnique({
      where: { planId_versionNumber: { planId, versionNumber: versionA } },
    }),
    prisma.trainingPlanVersion.findUnique({
      where: { planId_versionNumber: { planId, versionNumber: versionB } },
    }),
  ]);

  if (!a || !b) throw new Error("Version introuvable");

  const snapshotA: PlanSnapshot = JSON.parse(a.snapshot);
  const snapshotB: PlanSnapshot = JSON.parse(b.snapshot);

  // Calculer le numéro de semaine actuel pour filtrer les semaines passées
  let currentWeekNumber = 1;
  if (plan?.startDate) {
    const now = new Date();
    const planStart = new Date(plan.startDate);
    if (planStart < now) {
      currentWeekNumber = Math.floor(
        (now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000)
      ) + 1;
    }
  }

  // Filtrer les semaines passées des snapshots avant comparaison
  const filteredSnapshotA: PlanSnapshot = {
    ...snapshotA,
    weeks: snapshotA.weeks.filter((w) => w.weekNumber >= currentWeekNumber),
  };
  const filteredSnapshotB: PlanSnapshot = {
    ...snapshotB,
    weeks: snapshotB.weeks.filter((w) => w.weekNumber >= currentWeekNumber),
  };

  return {
    versionA: { ...a, snapshot: snapshotA }, // Snapshots complets pour affichage
    versionB: { ...b, snapshot: snapshotB },
    diff: computeVersionDiff(filteredSnapshotA, filteredSnapshotB), // Diff sans semaines passées
  };
}

/**
 * Restaure un plan à une version précédente
 * Recrée les semaines/sessions depuis le snapshot et crée une nouvelle version
 */
export async function restorePlanVersion(planId: string, versionNumber: number) {
  const version = await prisma.trainingPlanVersion.findUnique({
    where: { planId_versionNumber: { planId, versionNumber } },
  });
  if (!version) throw new Error("Version introuvable");

  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: { weeks: { include: { sessions: true } } },
  });
  if (!plan) throw new Error("Plan introuvable");

  const snapshot: PlanSnapshot = JSON.parse(version.snapshot);

  // Sauvegarder les liens activité-session AVANT suppression
  const savedLinks = new Map<string, { linkedActivityId: string; matchScore: number | null; completed: boolean }>();
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.linkedActivityId) {
        const key = `${week.weekNumber}-${session.dayOfWeek.toLowerCase()}`;
        savedLinks.set(key, {
          linkedActivityId: session.linkedActivityId,
          matchScore: session.matchScore,
          completed: session.completed,
        });
      }
    }
  }

  // Supprimer toutes les semaines actuelles
  for (const week of plan.weeks) {
    await prisma.trainingWeek.delete({ where: { id: week.id } });
  }

  // Recréer les semaines depuis le snapshot
  const now = new Date();
  const planStart = plan.startDate ? new Date(plan.startDate) : null;
  let currentWeekNumber = 1;
  if (planStart && planStart < now) {
    currentWeekNumber = Math.floor(
      (now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000)
    ) + 1;
  }

  for (const weekData of snapshot.weeks) {
    const dbWeek = await prisma.trainingWeek.create({
      data: {
        planId,
        weekNumber: weekData.weekNumber,
        theme: weekData.theme,
        totalVolume: weekData.totalVolume,
      },
    });

    const isPastWeek = weekData.weekNumber < currentWeekNumber;

    let sessionIndex = 0;
    for (const sessionData of weekData.sessions) {
      await prisma.trainingSession.create({
        data: {
          weekId: dbWeek.id,
          sortOrder: sessionData.sortOrder ?? sessionIndex++,
          dayOfWeek: sessionData.dayOfWeek,
          sessionType: sessionData.sessionType,
          title: sessionData.title,
          description: sessionData.description,
          distance: sessionData.distance,
          duration: sessionData.duration,
          targetPace: sessionData.targetPace,
          targetHRZone: sessionData.targetHRZone,
          intensity: sessionData.intensity,
          workoutSummary: sessionData.workoutSummary ?? null,
          elevationGain: sessionData.elevationGain ?? null,
          terrainType: sessionData.terrainType ?? null,
          exercises: sessionData.exercises ? JSON.stringify(sessionData.exercises) : null,
          completed: isPastWeek,
        },
      });
    }
  }

  // Restaurer les liens activité-session sauvegardés
  if (savedLinks.size > 0) {
    const newWeeks = await prisma.trainingWeek.findMany({
      where: { planId },
      include: { sessions: true },
    });
    for (const week of newWeeks) {
      for (const session of week.sessions) {
        const key = `${week.weekNumber}-${session.dayOfWeek.toLowerCase()}`;
        const saved = savedLinks.get(key);
        if (saved) {
          await prisma.trainingSession.update({
            where: { id: session.id },
            data: {
              linkedActivityId: saved.linkedActivityId,
              matchScore: saved.matchScore,
              completed: saved.completed,
            },
          });
        }
      }
    }
  }

  // Calculer le prochain numéro de version (max existant + 1)
  const maxVersion = await prisma.trainingPlanVersion.findFirst({
    where: { planId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const newVersionNumber = (maxVersion?.versionNumber ?? plan.currentVersion) + 1;

  await prisma.trainingPlanVersion.create({
    data: {
      planId,
      versionNumber: newVersionNumber,
      snapshot: version.snapshot, // Même snapshot
      triggerReason: "restore",
      changelogSummary: `Restauration vers v${versionNumber}`,
      changelogDetails: `Le plan a été restauré à l'état de la version ${versionNumber} (${new Date(version.createdAt).toLocaleDateString("fr-FR")}).`,
      sessionsAdded: 0,
      sessionsRemoved: 0,
      sessionsModified: 0,
      volumeChange: null,
    },
  });

  // Mettre à jour le plan
  await prisma.trainingPlan.update({
    where: { id: planId },
    data: {
      currentVersion: newVersionNumber,
      goalProbability: snapshot.goalProbability,
      goalAssessment: snapshot.goalAssessment,
    },
  });

  await cleanupOldVersions(planId);

  return { success: true, newVersionNumber };
}

/**
 * Supprime une version spécifique (sauf la version actuelle)
 */
export async function deletePlanVersion(planId: string, versionNumber: number) {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
  });
  if (!plan) throw new Error("Plan introuvable");

  // Ne pas supprimer la version actuelle
  if (plan.currentVersion === versionNumber) {
    throw new Error("Impossible de supprimer la version actuelle");
  }

  // Vérifier qu'il reste au moins 2 versions
  const versionCount = await prisma.trainingPlanVersion.count({
    where: { planId },
  });
  if (versionCount <= 1) {
    throw new Error("Impossible de supprimer la dernière version");
  }

  await prisma.trainingPlanVersion.delete({
    where: { planId_versionNumber: { planId, versionNumber } },
  });

  return { success: true };
}

/**
 * Définit une version comme version par défaut et restaure les données
 * Contrairement à restorePlanVersion, ne crée PAS de nouvelle version
 */
export async function setDefaultVersion(planId: string, versionNumber: number) {
  const version = await prisma.trainingPlanVersion.findUnique({
    where: { planId_versionNumber: { planId, versionNumber } },
  });
  if (!version) throw new Error("Version introuvable");

  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: { weeks: { include: { sessions: true } } },
  });
  if (!plan) throw new Error("Plan introuvable");

  const snapshot: PlanSnapshot = JSON.parse(version.snapshot);

  // Sauvegarder les liens activité-session AVANT suppression
  const savedLinks = new Map<string, { linkedActivityId: string; matchScore: number | null; completed: boolean }>();
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.linkedActivityId) {
        const key = `${week.weekNumber}-${session.dayOfWeek.toLowerCase()}`;
        savedLinks.set(key, {
          linkedActivityId: session.linkedActivityId,
          matchScore: session.matchScore,
          completed: session.completed,
        });
      }
    }
  }

  // Supprimer toutes les semaines actuelles
  for (const week of plan.weeks) {
    await prisma.trainingWeek.delete({ where: { id: week.id } });
  }

  // Recréer les semaines depuis le snapshot
  const now = new Date();
  const planStart = plan.startDate ? new Date(plan.startDate) : null;
  let currentWeekNumber = 1;
  if (planStart && planStart < now) {
    currentWeekNumber = Math.floor(
      (now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000)
    ) + 1;
  }

  for (const weekData of snapshot.weeks) {
    const dbWeek = await prisma.trainingWeek.create({
      data: {
        planId,
        weekNumber: weekData.weekNumber,
        theme: weekData.theme,
        totalVolume: weekData.totalVolume,
      },
    });

    const isPastWeek = weekData.weekNumber < currentWeekNumber;

    let sessionIndex = 0;
    for (const sessionData of weekData.sessions) {
      await prisma.trainingSession.create({
        data: {
          weekId: dbWeek.id,
          sortOrder: sessionData.sortOrder ?? sessionIndex++,
          dayOfWeek: sessionData.dayOfWeek,
          sessionType: sessionData.sessionType,
          title: sessionData.title,
          description: sessionData.description,
          distance: sessionData.distance,
          duration: sessionData.duration,
          targetPace: sessionData.targetPace,
          targetHRZone: sessionData.targetHRZone,
          intensity: sessionData.intensity,
          workoutSummary: sessionData.workoutSummary ?? null,
          elevationGain: sessionData.elevationGain ?? null,
          terrainType: sessionData.terrainType ?? null,
          exercises: sessionData.exercises ? JSON.stringify(sessionData.exercises) : null,
          completed: isPastWeek,
        },
      });
    }
  }

  // Restaurer les liens activité-session sauvegardés
  if (savedLinks.size > 0) {
    const newWeeks = await prisma.trainingWeek.findMany({
      where: { planId },
      include: { sessions: true },
    });
    for (const week of newWeeks) {
      for (const session of week.sessions) {
        const key = `${week.weekNumber}-${session.dayOfWeek.toLowerCase()}`;
        const saved = savedLinks.get(key);
        if (saved) {
          await prisma.trainingSession.update({
            where: { id: session.id },
            data: {
              linkedActivityId: saved.linkedActivityId,
              matchScore: saved.matchScore,
              completed: saved.completed,
            },
          });
        }
      }
    }
  }

  // Mettre à jour le plan pour pointer vers cette version
  await prisma.trainingPlan.update({
    where: { id: planId },
    data: {
      currentVersion: versionNumber,
      goalProbability: snapshot.goalProbability,
      goalAssessment: snapshot.goalAssessment,
    },
  });

  return { success: true };
}
