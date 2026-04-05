"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type {
  PlanSnapshot,
  SessionSnapshot,
  VersionDiff,
  VersionSummary,
} from "@/types/training-version";

// Helper pour retry avec backoff exponentiel
async function withRetry<T>(
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

async function createPlanSnapshot(
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

function computeVersionDiff(
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

async function cleanupOldVersions(planId: string) {
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

// ============================================================================
// TRAINING PLAN GENERATION
// ============================================================================

export interface TrainingPlanInput {
  raceType: string;
  raceDate?: string;
  startDate?: string;
  targetDistance?: number;
  targetElevation?: number;
  targetTime?: string;
  daysPerWeek: number;
  longRunDay: string;
  planningMode: "time" | "distance";
  includeStrength?: boolean;
  strengthFrequency?: number;
}

function getModeInstruction(planningMode: "time" | "distance"): string {
  return planningMode === "time"
    ? `Privilégie la DURÉE (minutes) pour chaque séance. Le champ "duration" est OBLIGATOIRE, "distance" est optionnel (fractionné sur piste uniquement).`
    : `Privilégie la DISTANCE (km) pour chaque séance. Le champ "distance" est OBLIGATOIRE (sauf repos), "duration" est optionnel.`;
}

function getSessionSchema(planningMode: "time" | "distance"): string {
  return `{
  "dayOfWeek": "lundi|mardi|...|dimanche",
  "sessionType": "easy|tempo|interval|long_run|recovery|rest|strength",
  "title": "string - titre court",
  "description": "string - détail avec ${planningMode === "time" ? "durée" : "distance"} en priorité",
  "distance": "number|null (km)",
  "duration": "number|null (minutes)",
  "targetPace": "string|null - ex: 5:30/km",
  "targetHRZone": "string|null - ex: Z2, Z3-Z4",
  "intensity": "low|moderate|high|very_high",
  "workoutSummary": "string|null - résumé court AVEC récup : 8×400m r=1'30, 3×10' Z4 r=3', 2×(6×200m r=30s) R=3', null si séance simple",
  "elevationGain": "number|null - D+ en mètres, OBLIGATOIRE pour les plans trail (même 0 pour une séance plate)",
  "terrainType": "string|null - type de terrain : route, chemin, sentier, sentier technique, montagne, piste. OBLIGATOIRE pour les plans trail",
  "exercises": "array|null - OBLIGATOIRE si sessionType=strength. Tableau d'exercices : [{ name: string, sets: number, reps: string (ex: '12' ou '30s'), tip: string (conseil d'exécution court, posture clé) }]"
}`;
}

function getCreateSystemPrompt(planningMode: "time" | "distance"): string {
  return `Tu es un coach expert en course à pied. Génère des plans d'entraînement structurés et personnalisés.

${getModeInstruction(planningMode)}

Réponds UNIQUEMENT en JSON valide (pas de markdown), avec cette structure :
{
  "name": "string - nom du plan",
  "goalProbability": "number 0-100 basé sur le niveau actuel, l'objectif et le temps de préparation",
  "goalAssessment": "string - évaluation courte (2-3 phrases) de la faisabilité",
  "weeks": [
    {
      "weekNumber": "number",
      "theme": "string - Base, Développement, Spécifique, Affûtage, etc.",
      "totalVolume": "number - km prévus",
      "sessions": [${getSessionSchema(planningMode)}]
    }
  ]
}

Règles :
- Respecte le nombre de jours d'entraînement demandé
- Place la sortie longue le jour demandé
- Inclus des jours de repos

Règles RENFORCEMENT MUSCULAIRE (si demandé) :
- CRITIQUE : génère EXACTEMENT le nombre de séances de course demandé + EXACTEMENT le nombre de séances strength demandé.
  Si 3 courses + 2 renforcements → la semaine DOIT contenir 3 sessions course (easy/tempo/interval/long_run/recovery) ET 2 sessions strength = 5 sessions total.
  Si 4 courses + 3 renforcements → 4 sessions course ET 3 sessions strength = 7 sessions total.
  NE JAMAIS remplacer une course par un renforcement. Les deux sont indépendants.
- Les séances de renforcement PEUVENT être placées le même jour qu'une séance facile (EF) ou récupération. Dans ce cas, génère les deux séances séparées le même jour.
- Ne PAS placer de renforcement le même jour qu'une séance intensive (fractionné, tempo, sortie longue)
- Adapte les exercices au type de course : gainage/proprioception pour trail, plyométrie pour 10km, endurance musculaire pour marathon
- Le champ "description" doit résumer la séance en une phrase courte
- Le champ "exercises" est OBLIGATOIRE pour chaque séance strength : tableau d'exercices avec name, sets, reps, tip
- Utilise des noms d'exercices standards et reconnus (ex: "Squats", "Fentes bulgares", "Planche", "Pompes", "Chaise", "Gainage latéral")
- Le champ "tip" doit donner un conseil d'exécution concret (posture, erreur à éviter)
- Le champ "duration" indique la durée en minutes (typiquement 20-40 min)
- Progresse dans la difficulté au fil des semaines (volume → intensité → spécificité)
- En phase d'affûtage, réduis le renforcement (maintien uniquement)
- 4 à 8 exercices par séance

Règles spécifiques TRAIL (si raceType contient "trail") :
- OBLIGATOIRE : renseigne "elevationGain" (D+ en mètres) et "terrainType" pour CHAQUE séance non-repos
- Répartis le D+ cible total intelligemment sur les semaines (progressif)
- Varie les terrains : route (récup/tempo plat), chemin (EF vallonné), sentier (SL trail), sentier technique (spécifique descente), montagne (côtes raides)
- Inclus des séances spécifiques trail : côtes, descente technique, dénivelé positif soutenu
- Le workoutSummary pour les séances de côtes doit mentionner la pente : ex "3×8' côte r=3' descente", "6×3' côte raide (>15%) r=descente"
- targetPace en trail doit être adapté au terrain (plus lent en sentier technique qu'en chemin)`;
}

function getUpdateSystemPrompt(planningMode: "time" | "distance"): string {
  return `Tu es un coach expert en course à pied. Tu mets à jour un plan d'entraînement existant.

${getModeInstruction(planningMode)}

STABILITÉ MAXIMALE : conserve le plan IDENTIQUE sauf si une activité récente justifie un ajustement.
- Max 2-3 séances modifiées par mise à jour
- Modifier uniquement si signaux clairs :
  • Surcharge (réalisé > prévu) : TE > 4.5, FC > 90% FCmax, ou distance/durée réalisée > prévu de +20% → RÉDUIRE les 2-3 jours suivants de 10-15%
  • Sous-charge (réalisé < prévu) : TE < 2.0, ou distance/durée réalisée < prévu de -20% → AUGMENTER légèrement de 5-10%
  • LOGIQUE IMPORTANTE : si l'athlète fait MOINS que prévu → augmenter ou maintenir, si l'athlète fait PLUS que prévu → réduire
- Sans signal problématique → 0 modification
- Adaptation PROGRESSIVE : ne jamais changer brutalement (ex: passer de 10km à 15km d'un coup)

Réponds UNIQUEMENT en JSON valide (pas de markdown), avec cette structure :
{
  "name": "string",
  "goalProbability": "number 0-100",
  "goalAssessment": "string",
  "weeks": [
    {
      "weekNumber": "number",
      "theme": "string",
      "totalVolume": "number",
      "sessions": [
        {
          ${getSessionSchema(planningMode).slice(2, -2)},
          "changeReason": "string|null - null si inchangée, sinon format: [ancien] → [nouveau] car [données chiffrées]"
        }
      ]
    }
  ],
  "sessionsToDelete": [
    { "weekNumber": "number", "dayOfWeek": "string", "reason": "string obligatoire" }
  ],
  "changelog": {
    "summary": "string - résumé court global",
    "details": "string - vue d'ensemble des modifications"
  }
}

changeReason :
- null = séance identique, aucune modification
- Exemples valides : "easy → interval car TE aérobie 4.5 (course du 15/02)", "45min → 30min car FC moy 165bpm"
- INTERDIT : raisons génériques sans données ("Initialisation", "Optimisation", "Adaptation")

Règles spécifiques TRAIL (si raceType contient "trail") :
- Conserve les champs "elevationGain" et "terrainType" pour chaque séance non-repos
- Si tu modifies une séance, adapte aussi son D+ et terrain si pertinent`;
}

export async function generateTrainingPlan(input: TrainingPlanInput) {
  const user = await getAuthenticatedUser();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set");

  // Create plan in DB first
  const plan = await prisma.trainingPlan.create({
    data: {
      userId: user.id,
      name: `Plan ${input.raceType}`,
      raceType: input.raceType,
      raceDate: input.raceDate ? new Date(input.raceDate) : null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      targetDistance: input.targetDistance ?? null,
      targetElevation: input.targetElevation ?? null,
      targetTime: input.targetTime ?? null,
      daysPerWeek: input.daysPerWeek,
      longRunDay: input.longRunDay,
      planningMode: input.planningMode,
      includeStrength: input.includeStrength ?? false,
      strengthFrequency: input.includeStrength ? (input.strengthFrequency ?? 2) : null,
    },
  });

  // Load recent activities for context
  const recentActivities = await prisma.activity.findMany({
    where: { userId: user.id },
    orderBy: { startTimeLocal: "desc" },
    take: 30,
  });

  // Calculate fitness metrics
  const last4Weeks = recentActivities.filter(
    (a) => a.startTimeLocal > new Date(Date.now() - 28 * 24 * 3600 * 1000)
  );

  const weeklyVolume =
    last4Weeks.reduce((sum, a) => sum + a.distance, 0) / 1000 / 4; // km/week avg
  const avgPace =
    last4Weeks.length > 0
      ? last4Weeks.reduce((sum, a) => sum + (a.averageSpeed ?? 0), 0) /
        last4Weeks.length
      : 0;
  const longestRun = Math.max(
    ...recentActivities.map((a) => a.distance / 1000),
    0
  );
  const latestVO2max = recentActivities.find((a) => a.vo2max)?.vo2max ?? null;

  const fitnessContext = {
    weeklyVolumeKm: +weeklyVolume.toFixed(1),
    avgPaceSecPerKm: avgPace > 0 ? Math.round(1000 / avgPace) : null,
    longestRunKm: +longestRun.toFixed(1),
    vo2max: latestVO2max,
    weight: user.weight,
    restingHR: user.restingHR,
    maxHR: user.maxHR,
  };

  // Calculate plan timeline
  const now = new Date();
  const planStart = input.startDate ? new Date(input.startDate) : now;
  let totalWeeks: number;
  let pastWeeks = 0;

  if (input.raceDate) {
    const raceDate = new Date(input.raceDate);
    totalWeeks = Math.max(
      1,
      Math.round((raceDate.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000))
    );
  } else {
    totalWeeks = 8;
  }

  if (input.startDate && planStart < now) {
    pastWeeks = Math.min(
      totalWeeks,
      Math.round((now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000))
    );
  }

  // Load actual activities from past weeks for context
  let pastActivitiesSummary = "";
  if (pastWeeks > 0) {
    const pastActivities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        startTimeLocal: { gte: planStart },
      },
      orderBy: { startTimeLocal: "asc" },
    });

    if (pastActivities.length > 0) {
      const byWeek: Record<number, typeof pastActivities> = {};
      for (const a of pastActivities) {
        const weekNum =
          Math.floor(
            (a.startTimeLocal.getTime() - planStart.getTime()) /
              (7 * 24 * 3600 * 1000)
          ) + 1;
        if (weekNum >= 1 && weekNum <= pastWeeks) {
          (byWeek[weekNum] ??= []).push(a);
        }
      }

      pastActivitiesSummary = `\nActivités réelles des ${pastWeeks} semaines passées (depuis le ${planStart.toLocaleDateString("fr-FR")}) :\n`;
      for (let w = 1; w <= pastWeeks; w++) {
        const acts = byWeek[w] ?? [];
        if (acts.length === 0) {
          pastActivitiesSummary += `- Semaine ${w} : aucune activité enregistrée\n`;
        } else {
          const totalKm = acts.reduce((s, a) => s + a.distance / 1000, 0);
          pastActivitiesSummary += `- Semaine ${w} : ${acts.length} séances, ${totalKm.toFixed(1)} km total\n`;
        }
      }
    }
  }

  const nowStr = now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const lastSyncStr = user.lastSyncAt
    ? user.lastSyncAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : "jamais";

  const prompt = `Date et heure actuelles : ${nowStr}
Dernière synchronisation Garmin : ${lastSyncStr}

Génère un plan d'entraînement avec ces paramètres :
- Type de course : ${input.raceType}
${input.targetDistance ? `- Distance cible : ${input.targetDistance} km` : ""}
${input.targetElevation ? `- D+ cible : ${input.targetElevation} m` : ""}
${input.targetTime ? `- Objectif chrono : ${input.targetTime}` : ""}
- Séances de COURSE par semaine : ${input.daysPerWeek} (c'est le nombre de séances de type easy/tempo/interval/long_run/recovery, PAS le total)
- Jour de sortie longue : ${input.longRunDay}
${input.includeStrength ? `- Séances de RENFORCEMENT MUSCULAIRE par semaine : ${input.strengthFrequency ?? 2} (sessionType: "strength", EN PLUS des ${input.daysPerWeek} séances de course)
- TOTAL de séances par semaine : ${input.daysPerWeek} courses + ${input.strengthFrequency ?? 2} renforcements = ${input.daysPerWeek + (input.strengthFrequency ?? 2)} séances` : ""}
- Durée totale du plan : ${totalWeeks} semaines
${pastWeeks > 0 ? `- Semaines déjà écoulées : ${pastWeeks} (les semaines 1 à ${pastWeeks} sont dans le passé, génère-les quand même pour montrer la progression rétrospective)` : ""}
${pastActivitiesSummary}
Profil du coureur :
${JSON.stringify(fitnessContext, null, 2)}`;

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      systemInstruction: getCreateSystemPrompt(input.planningMode),
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const text = response.text ?? "{}";
  const generated = JSON.parse(text);

  // Update plan name and goal probability
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: {
      name: generated.name || plan.name,
      goalProbability: generated.goalProbability ?? null,
      goalAssessment: generated.goalAssessment ?? null,
    },
  });

  // Create weeks and sessions
  if (Array.isArray(generated.weeks)) {
    for (const week of generated.weeks) {
      const dbWeek = await prisma.trainingWeek.create({
        data: {
          planId: plan.id,
          weekNumber: week.weekNumber,
          theme: week.theme ?? "Entraînement",
          totalVolume: week.totalVolume ?? null,
        },
      });

      const isPastWeek = week.weekNumber <= pastWeeks;

      if (Array.isArray(week.sessions)) {
        let sessionIndex = 0;
        for (const session of week.sessions) {
          await prisma.trainingSession.create({
            data: {
              weekId: dbWeek.id,
              sortOrder: sessionIndex++,
              dayOfWeek: session.dayOfWeek ?? "lundi",
              sessionType: session.sessionType ?? "easy",
              title: session.title ?? "Séance",
              description: session.description ?? "",
              distance: session.distance ?? null,
              duration: session.duration ?? null,
              targetPace: session.targetPace ?? null,
              targetHRZone: session.targetHRZone ?? null,
              intensity: session.intensity ?? "moderate",
              workoutSummary: session.workoutSummary ?? null,
              elevationGain: session.elevationGain ?? null,
              terrainType: session.terrainType ?? null,
              exercises: session.exercises ? JSON.stringify(session.exercises) : null,
              completed: isPastWeek,
            },
          });
        }
      }
    }
  }

  // Create initial version snapshot
  await createPlanSnapshot(plan.id, "initial");

  // Set lastUpdatedAt for future update checks
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { lastUpdatedAt: new Date() },
  });

  return { planId: plan.id };
}

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

export async function updateTrainingPlan(
  planId: string,
  startDate?: string,
): Promise<{ planId: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set");

  const isBackfill = !!startDate;

  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      user: true,
      weeks: {
        include: {
          sessions: {
            include: {
              linkedActivity: true,
            },
          },
        },
        orderBy: { weekNumber: "asc" },
      },
    },
  });
  if (!plan) throw new Error("Plan introuvable");

  const triggerReason = isBackfill ? "backfill" : "manual_update";
  let previousVersionNumber = plan.currentVersion;

  // Only create snapshot if plan has weeks (not empty)
  if (plan.weeks.length > 0) {
    const snapshotResult = await createPlanSnapshot(plan.id, triggerReason);
    previousVersionNumber = snapshotResult.versionNumber;
  }

  const now = new Date();
  const planStart = startDate ? new Date(startDate) : (plan.startDate ? new Date(plan.startDate) : null);

  // Calculate current week number based on plan start date
  let currentWeekNumber = 1;
  if (planStart && planStart < now) {
    currentWeekNumber = Math.floor(
      (now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000)
    ) + 1;
  }

  // Calculer les semaines passées si backfill
  let pastWeeks = 0;
  if (isBackfill && planStart && planStart < now) {
    pastWeeks = Math.max(
      1,
      Math.round((now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000))
    );
  }

  // Séparer semaines passées vs futures basé sur la DATE, pas sur completed
  // Une semaine est "passée" si son numéro est < semaine actuelle
  const completedWeeks = isBackfill
    ? [] // On régénère tout si backfill
    : plan.weeks.filter((w) => w.weekNumber < currentWeekNumber);

  const weeksToDelete = isBackfill
    ? plan.weeks // Tout supprimer si backfill
    : plan.weeks.filter((w) => w.weekNumber >= currentWeekNumber);

  // Charger les activités récentes
  const recentActivities = await prisma.activity.findMany({
    where: { userId: plan.userId },
    orderBy: { startTimeLocal: "desc" },
    take: 30,
  });

  const last4Weeks = recentActivities.filter(
    (a) => a.startTimeLocal > new Date(Date.now() - 28 * 24 * 3600 * 1000)
  );
  const weeklyVolume =
    last4Weeks.reduce((sum, a) => sum + a.distance, 0) / 1000 / 4;
  const avgPace =
    last4Weeks.length > 0
      ? last4Weeks.reduce((sum, a) => sum + (a.averageSpeed ?? 0), 0) /
        last4Weeks.length
      : 0;
  const latestVO2max = recentActivities.find((a) => a.vo2max)?.vo2max ?? null;

  // Récupérer les nouvelles activités depuis la dernière mise à jour (clé pour l'adaptation)
  const lastUpdatedAt = plan.lastUpdatedAt;

  // Protection contre les doubles mises à jour rapides :
  // Si le plan a été mis à jour il y a moins de 5 minutes, on skip l'analyse d'adaptation
  const MIN_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const timeSinceLastUpdate = lastUpdatedAt ? now.getTime() - lastUpdatedAt.getTime() : Infinity;
  const skipAdaptationAnalysis = timeSinceLastUpdate < MIN_UPDATE_INTERVAL_MS;

  const newActivitiesSinceLastUpdate = (lastUpdatedAt && !skipAdaptationAnalysis)
    ? recentActivities.filter((a) => a.startTimeLocal > lastUpdatedAt)
    : [];

  // Récupérer les séances récentes liées à des activités pour analyse planifié vs réalisé
  // On skip si mise à jour récente pour éviter les doubles ajustements
  const recentLinkedSessions = skipAdaptationAnalysis ? [] : plan.weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.linkedActivity && s.linkedActivityId)
    .filter((s) => {
      const activity = s.linkedActivity!;
      return !lastUpdatedAt || activity.startTimeLocal > lastUpdatedAt;
    })
    .slice(0, 10); // Limiter aux 10 dernières

  // Fonction pour évaluer la difficulté perçue
  const evaluateDifficulty = (session: typeof recentLinkedSessions[0]) => {
    const activity = session.linkedActivity!;
    const indicators: string[] = [];
    let difficultyScore = 0; // -2 à +2 (négatif = trop facile, positif = trop dur)

    // 1. Training Effect aérobie (>4 = très dur, <2 = récupération active)
    if (activity.aerobicTrainingEffect) {
      if (activity.aerobicTrainingEffect >= 4.5) {
        difficultyScore += 2;
        indicators.push("TE très élevé");
      } else if (activity.aerobicTrainingEffect >= 3.5) {
        difficultyScore += 1;
        indicators.push("TE élevé");
      } else if (activity.aerobicTrainingEffect < 2.0) {
        difficultyScore -= 1;
        indicators.push("TE faible");
      }
    }

    // 2. Comparaison distance réalisée vs planifiée
    if (session.distance && session.distance > 0) {
      const actualKm = activity.distance / 1000;
      const ratio = actualKm / session.distance;
      if (ratio > 1.2) {
        difficultyScore += 1;
        indicators.push(`+${Math.round((ratio - 1) * 100)}% distance`);
      } else if (ratio < 0.8) {
        difficultyScore -= 1;
        indicators.push(`${Math.round((ratio - 1) * 100)}% distance`);
      }
    }

    // 3. Comparaison durée réalisée vs planifiée
    if (session.duration && session.duration > 0) {
      const actualMin = activity.duration / 60;
      const ratio = actualMin / session.duration;
      if (ratio > 1.2) {
        difficultyScore += 1;
        indicators.push(`+${Math.round((ratio - 1) * 100)}% durée`);
      } else if (ratio < 0.8) {
        difficultyScore -= 1;
        indicators.push(`${Math.round((ratio - 1) * 100)}% durée`);
      }
    }

    // 4. FC moyenne élevée
    if (activity.averageHR && plan.user.maxHR) {
      const hrPercent = (activity.averageHR / plan.user.maxHR) * 100;
      if (hrPercent > 85) {
        difficultyScore += 1;
        indicators.push(`FC à ${Math.round(hrPercent)}% FCmax`);
      }
    }

    // Interprétation du score
    let assessment: string;
    if (difficultyScore >= 2) {
      assessment = "⚠️ SÉANCE TRÈS DIFFICILE";
    } else if (difficultyScore >= 1) {
      assessment = "↗️ Séance plus dure que prévu";
    } else if (difficultyScore <= -2) {
      assessment = "↘️ Séance très facile";
    } else if (difficultyScore <= -1) {
      assessment = "↘️ Séance plus facile que prévu";
    } else {
      assessment = "✓ Séance conforme au plan";
    }

    return { difficultyScore, assessment, indicators };
  };

  // Résumé des nouvelles activités avec analyse planifié vs réalisé
  let newActivitiesSummary = "";

  if (recentLinkedSessions.length > 0) {
    newActivitiesSummary += `\nANALYSE DES SÉANCES RÉCENTES (PLANIFIÉ VS RÉALISÉ) :\n`;

    for (const session of recentLinkedSessions) {
      const activity = session.linkedActivity!;
      const { assessment, indicators } = evaluateDifficulty(session);

      const actualDistKm = (activity.distance / 1000).toFixed(1);
      const actualDurMin = Math.round(activity.duration / 60);
      const plannedDistKm = session.distance?.toFixed(1) ?? "N/A";
      const plannedDurMin = session.duration ?? "N/A";

      newActivitiesSummary += `\n- ${activity.startTimeLocal.toLocaleDateString("fr-FR")} : ${session.title} (${session.sessionType})\n`;
      newActivitiesSummary += `  Planifié: ${plannedDistKm}km / ${plannedDurMin}min\n`;
      newActivitiesSummary += `  Réalisé: ${actualDistKm}km / ${actualDurMin}min`;
      if (activity.averageHR) newActivitiesSummary += ` - FC moy: ${activity.averageHR}bpm`;
      if (activity.aerobicTrainingEffect) newActivitiesSummary += ` - TE: ${activity.aerobicTrainingEffect.toFixed(1)}`;
      newActivitiesSummary += `\n  ${assessment}`;
      if (indicators.length > 0) newActivitiesSummary += ` (${indicators.join(", ")})`;
      newActivitiesSummary += "\n";
    }

    // Résumé global de la tendance
    const avgDifficulty = recentLinkedSessions.reduce((sum, s) => sum + evaluateDifficulty(s).difficultyScore, 0) / recentLinkedSessions.length;

    if (avgDifficulty >= 1) {
      newActivitiesSummary += `\n⚠️ TENDANCE GÉNÉRALE : Les séances récentes semblent trop difficiles. RECOMMANDATION : Réduire l'intensité ou le volume des prochaines séances de 10-15% pour permettre la récupération.\n`;
    } else if (avgDifficulty <= -1) {
      newActivitiesSummary += `\n💪 TENDANCE GÉNÉRALE : Les séances récentes semblent trop faciles. RECOMMANDATION : Augmenter légèrement l'intensité ou le volume des prochaines séances de 5-10%.\n`;
    } else {
      newActivitiesSummary += `\n✓ TENDANCE GÉNÉRALE : Le plan est bien calibré, l'athlète suit correctement.\n`;
    }
  }

  // Ajouter les activités non liées (hors plan)
  const unlinkedActivities = newActivitiesSinceLastUpdate.filter(
    (a) => !recentLinkedSessions.some((s) => s.linkedActivityId === a.id)
  );

  if (unlinkedActivities.length > 0) {
    newActivitiesSummary += `\nACTIVITÉS HORS PLAN (depuis ${lastUpdatedAt?.toLocaleDateString("fr-FR") ?? "jamais"}) :\n`;
    newActivitiesSummary += unlinkedActivities.map((a) => {
      const distKm = (a.distance / 1000).toFixed(1);
      const durMin = Math.round(a.duration / 60);
      const paceSecPerKm = a.averageSpeed ? Math.round(1000 / a.averageSpeed) : null;
      const paceStr = paceSecPerKm ? `${Math.floor(paceSecPerKm / 60)}:${(paceSecPerKm % 60).toString().padStart(2, "0")}/km` : "N/A";
      return `- ${a.startTimeLocal.toLocaleDateString("fr-FR")} : ${a.activityName} - ${distKm}km en ${durMin}min (${paceStr})` +
        (a.averageHR ? ` - FC moy: ${a.averageHR}bpm` : "") +
        (a.aerobicTrainingEffect ? ` - TE: ${a.aerobicTrainingEffect.toFixed(1)}` : "");
    }).join("\n");
    newActivitiesSummary += "\n";
  }

  if (skipAdaptationAnalysis) {
    newActivitiesSummary = `\n⏳ MISE À JOUR RÉCENTE : Le plan a été mis à jour il y a moins de 5 minutes. Pour éviter les doubles ajustements, AUCUNE modification basée sur les activités récentes ne sera appliquée. Conserve le plan EXACTEMENT tel quel.\n`;
  } else if (newActivitiesSummary) {
    newActivitiesSummary += "\nADAPTE LE PLAN en fonction de ces observations : si l'athlète est en surcharge, allège les jours suivants ; si les séances sont trop faciles, augmente progressivement.";
  }

  // Résumé des semaines complétées (mode normal uniquement)
  const completedSummary = completedWeeks.map((w) => ({
    weekNumber: w.weekNumber,
    theme: w.theme,
    sessions: w.sessions.map((s) => ({
      type: s.sessionType,
      title: s.title,
      completed: s.completed,
      distance: s.distance,
      duration: s.duration,
    })),
  }));

  // JSON compact des semaines existantes (sans indentation pour réduire tokens)
  const existingWeeksJSON = JSON.stringify(weeksToDelete.map((w) => ({
    weekNumber: w.weekNumber,
    theme: w.theme,
    totalVolume: w.totalVolume,
    sessions: w.sessions.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      sessionType: s.sessionType,
      title: s.title,
      distance: s.distance,
      duration: s.duration,
      targetPace: s.targetPace,
      targetHRZone: s.targetHRZone,
      intensity: s.intensity,
    })),
  })));

  // Résumé des activités passées pour le backfill
  let pastActivitiesSummary = "";
  if (isBackfill && planStart && pastWeeks > 0) {
    const pastActivities = await prisma.activity.findMany({
      where: {
        userId: plan.userId,
        startTimeLocal: { gte: planStart },
      },
      orderBy: { startTimeLocal: "asc" },
    });

    if (pastActivities.length > 0) {
      const byWeek: Record<number, typeof pastActivities> = {};
      for (const a of pastActivities) {
        const weekNum =
          Math.floor(
            (a.startTimeLocal.getTime() - planStart.getTime()) /
              (7 * 24 * 3600 * 1000)
          ) + 1;
        if (weekNum >= 1 && weekNum <= pastWeeks) {
          (byWeek[weekNum] ??= []).push(a);
        }
      }

      pastActivitiesSummary = `\nActivités réelles des ${pastWeeks} semaines passées (depuis le ${planStart.toLocaleDateString("fr-FR")}) :\n`;
      for (let w = 1; w <= pastWeeks; w++) {
        const acts = byWeek[w] ?? [];
        if (acts.length === 0) {
          pastActivitiesSummary += `- Semaine ${w} : aucune activité enregistrée\n`;
        } else {
          const totalKm = acts.reduce((s, a) => s + a.distance / 1000, 0);
          pastActivitiesSummary += `- Semaine ${w} : ${acts.length} séances, ${totalKm.toFixed(1)} km total\n`;
        }
      }
    }
  }

  // Calculer les semaines à générer
  let totalWeeksToGenerate: number;
  if (isBackfill && plan.raceDate && planStart) {
    totalWeeksToGenerate = Math.max(
      1,
      Math.round(
        (new Date(plan.raceDate).getTime() - planStart.getTime()) /
          (7 * 24 * 3600 * 1000)
      )
    );
  } else if (plan.raceDate) {
    totalWeeksToGenerate = Math.max(
      1,
      Math.round(
        (new Date(plan.raceDate).getTime() - now.getTime()) /
          (7 * 24 * 3600 * 1000)
      )
    );
  } else {
    totalWeeksToGenerate = isBackfill
      ? (plan.weeks.length || 8) + pastWeeks
      : weeksToDelete.length || 8;
  }

  const nowStr = now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const lastSyncStr = plan.user.lastSyncAt
    ? plan.user.lastSyncAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : "jamais";

  let prompt: string;
  if (isBackfill) {
    prompt = `Date et heure actuelles : ${nowStr}
Dernière synchronisation Garmin : ${lastSyncStr}

Régénère entièrement un plan d'entraînement en incluant les semaines rétrospectives.

Plan :
- Nom : ${plan.name}
- Type de course : ${plan.raceType}
${plan.targetTime ? `- Objectif chrono : ${plan.targetTime}` : ""}
${plan.raceDate ? `- Date de course : ${new Date(plan.raceDate).toLocaleDateString("fr-FR")}` : ""}
- Jours d'entraînement par semaine : ${plan.daysPerWeek}
- Jour de sortie longue : ${plan.longRunDay}
- Durée totale du plan : ${totalWeeksToGenerate} semaines
- Semaines déjà écoulées : ${pastWeeks} (les semaines 1 à ${pastWeeks} sont dans le passé, génère-les quand même pour montrer la progression rétrospective)
${pastActivitiesSummary}
Profil actuel du coureur :
- Volume hebdo : ${weeklyVolume.toFixed(1)} km
- Allure moyenne : ${avgPace > 0 ? Math.round(1000 / avgPace) : "N/A"} sec/km
- VO2max : ${latestVO2max ?? "N/A"}
- FC repos : ${plan.user.restingHR ?? "N/A"}
- FC max : ${plan.user.maxHR ?? "N/A"}

Génère les ${totalWeeksToGenerate} semaines complètes (passées + futures).`;
  } else {
    prompt = `Date et heure actuelles : ${nowStr}
Dernière synchronisation Garmin : ${lastSyncStr}

Mets à jour un plan d'entraînement existant en régénérant UNIQUEMENT les semaines futures.

IMPORTANT : Nous sommes actuellement à la SEMAINE ${currentWeekNumber}.
Les semaines 1 à ${currentWeekNumber - 1} sont dans le passé et NE DOIVENT PAS être régénérées.

Plan :
- Nom : ${plan.name}
- Type de course : ${plan.raceType}
${plan.targetTime ? `- Objectif chrono : ${plan.targetTime}` : ""}
${plan.raceDate ? `- Date de course : ${new Date(plan.raceDate).toLocaleDateString("fr-FR")}` : ""}
- Jours d'entraînement par semaine : ${plan.daysPerWeek}
- Jour de sortie longue : ${plan.longRunDay}

Semaines passées (pour contexte, NE PAS régénérer) :
${JSON.stringify(completedSummary, null, 2)}

PLAN EXISTANT (JSON) - COPIE CES VALEURS EXACTEMENT :
${existingWeeksJSON}

INSTRUCTION CRITIQUE : Retourne ce JSON tel quel. Ne modifie une valeur QUE si le profil du coureur justifie un changement. Si tu modifies, mets changeReason explicatif. Sinon changeReason = null.

Profil actuel du coureur :
- Volume hebdo : ${weeklyVolume.toFixed(1)} km
- Allure moyenne : ${avgPace > 0 ? Math.round(1000 / avgPace) : "N/A"} sec/km
- VO2max : ${latestVO2max ?? "N/A"}
- FC repos : ${plan.user.restingHR ?? "N/A"}
- FC max : ${plan.user.maxHR ?? "N/A"}
${newActivitiesSummary}
Génère les semaines ${currentWeekNumber} à ${currentWeekNumber + totalWeeksToGenerate - 1}.
Adapte la charge en fonction de la progression réelle du coureur et des activités récentes.`;
  }

  const ai = new GoogleGenAI({ apiKey });

  const planningMode = ((plan as { planningMode?: string }).planningMode as "time" | "distance") || "time";

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        systemInstruction: getUpdateSystemPrompt(planningMode),
        responseMimeType: "application/json",
        temperature: 0,
      },
    })
  );

  const text = response.text ?? "{}";
  const generated = JSON.parse(text) as {
    name?: string;
    goalProbability?: number;
    goalAssessment?: string;
    weeks?: Array<{
      weekNumber: number;
      theme?: string;
      totalVolume?: number;
      sessions?: Array<{
        dayOfWeek?: string;
        sessionType?: string;
        title?: string;
        description?: string;
        distance?: number;
        duration?: number;
        targetPace?: string;
        targetHRZone?: string;
        intensity?: string;
        workoutSummary?: string | null;
        changeReason?: string | null;
      }>;
    }>;
    changelog?: {
      summary?: string;
      details?: string;
    };
    sessionsToDelete?: Array<{
      weekNumber: number;
      dayOfWeek: string;
      reason: string;
    }>;
  };

  // Index des séances explicitement supprimées par l'IA (avec justification)
  const deletionsMap = new Map<string, string>();
  if (Array.isArray(generated.sessionsToDelete)) {
    for (const del of generated.sessionsToDelete) {
      if (del.reason) {
        const key = `${del.weekNumber}-${del.dayOfWeek.toLowerCase()}`;
        deletionsMap.set(key, del.reason);
      }
    }
  }

  // Créer un index des séances existantes pour le merge intelligent
  // Clé normalisée : weekNumber-dayOfWeek (minuscules)
  const existingSessionsMap = new Map<string, typeof weeksToDelete[0]["sessions"][0]>();
  for (const week of weeksToDelete) {
    for (const session of week.sessions) {
      const key = `${week.weekNumber}-${session.dayOfWeek.toLowerCase()}`;
      existingSessionsMap.set(key, session);
    }
  }

  // Type pour une séance (générée ou existante)
  type MergedSession = {
    dayOfWeek?: string;
    sessionType?: string;
    title?: string;
    description?: string;
    distance?: number | null;
    duration?: number | null;
    targetPace?: string | null;
    targetHRZone?: string | null;
    intensity?: string;
    workoutSummary?: string | null;
    changeReason?: string | null;
  };

  // Liste des raisons génériques à rejeter (l'IA doit justifier précisément)
  const INVALID_REASONS = [
    "initialisation",
    "phase spécifique",
    "planification optimisée",
    "adaptation",
    "préparation",
    "optimisation",
    "ajustement",
    "mise à jour",
  ];

  const isValidChangeReason = (reason: string | null | undefined): boolean => {
    if (!reason) return false;
    const lower = reason.toLowerCase();
    // Rejeter si contient un pattern générique sans données (ex: "TE 4.5", "FC 165")
    const hasData = /\d/.test(reason) || reason.includes("→");
    if (!hasData) {
      return !INVALID_REASONS.some((inv) => lower.includes(inv));
    }
    return true;
  };

  // Fonction pour merger intelligemment :
  // - Si l'IA fournit un changeReason VALIDE → accepter ses modifications
  // - Si raison générique ou absente → garder les valeurs existantes
  const mergeSession = (
    weekNumber: number,
    genSession: MergedSession | undefined
  ) => {
    if (!genSession) return genSession;
    const key = `${weekNumber}-${(genSession.dayOfWeek ?? "").toLowerCase()}`;
    const existing = existingSessionsMap.get(key);
    if (!existing) return genSession; // Nouvelle séance, pas de merge

    // Si l'IA fournit une raison VALIDE de modification → accepter les nouvelles valeurs
    if (isValidChangeReason(genSession.changeReason)) {
      return {
        dayOfWeek: genSession.dayOfWeek ?? existing.dayOfWeek,
        sessionType: genSession.sessionType ?? existing.sessionType,
        title: genSession.title ?? existing.title,
        description: genSession.description ?? existing.description,
        distance: genSession.distance ?? existing.distance,
        duration: genSession.duration ?? existing.duration,
        targetPace: genSession.targetPace ?? existing.targetPace,
        targetHRZone: genSession.targetHRZone ?? existing.targetHRZone,
        intensity: genSession.intensity ?? existing.intensity,
        workoutSummary: genSession.workoutSummary ?? existing.workoutSummary,
        changeReason: genSession.changeReason,
      };
    }

    // Pas de raison fournie → garder les valeurs existantes
    return {
      dayOfWeek: existing.dayOfWeek,
      sessionType: existing.sessionType,
      title: existing.title,
      description: existing.description,
      distance: existing.distance,
      duration: existing.duration,
      targetPace: existing.targetPace,
      targetHRZone: existing.targetHRZone,
      intensity: existing.intensity,
      workoutSummary: existing.workoutSummary,
      changeReason: null,
    };
  };

  // Sauvegarder les liens activité-session AVANT suppression
  // Clé : "weekNumber-dayOfWeek" → { linkedActivityId, matchScore, completed }
  const savedLinks = new Map<string, { linkedActivityId: string; matchScore: number | null; completed: boolean }>();
  for (const week of weeksToDelete) {
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

  // Supprimer les semaines concernées
  for (const week of weeksToDelete) {
    await prisma.trainingWeek.delete({ where: { id: week.id } });
  }

  // Stocker les semaines mergées pour le snapshot (au lieu d'utiliser les valeurs IA)
  const mergedWeeksForSnapshot: Array<{
    weekNumber: number;
    theme: string;
    totalVolume: number | null;
    sessions: MergedSession[];
  }> = [];

  // Créer les nouvelles semaines avec merge intelligent
  if (Array.isArray(generated.weeks)) {
    const sortedWeeks = [...generated.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

    for (let i = 0; i < sortedWeeks.length; i++) {
      const week = sortedWeeks[i];
      const correctWeekNumber = isBackfill ? (i + 1) : (currentWeekNumber + i);

      const dbWeek = await prisma.trainingWeek.create({
        data: {
          planId: plan.id,
          weekNumber: correctWeekNumber,
          theme: week.theme ?? "Entraînement",
          totalVolume: week.totalVolume ?? null,
        },
      });

      const isPastWeek = isBackfill && correctWeekNumber <= pastWeeks;
      const mergedSessions: MergedSession[] = [];

      const generatedDays = new Set<string>();
      let sessionIndex = 0;

      if (Array.isArray(week.sessions)) {
        for (const genSession of week.sessions) {
          const session = mergeSession(correctWeekNumber, genSession);
          mergedSessions.push(session ?? genSession);
          generatedDays.add((session?.dayOfWeek ?? genSession.dayOfWeek ?? "").toLowerCase());

          await prisma.trainingSession.create({
            data: {
              weekId: dbWeek.id,
              sortOrder: sessionIndex++,
              dayOfWeek: session?.dayOfWeek ?? "lundi",
              sessionType: session?.sessionType ?? "easy",
              title: session?.title ?? "Séance",
              description: session?.description ?? "",
              distance: session?.distance ?? null,
              duration: session?.duration ?? null,
              targetPace: session?.targetPace ?? null,
              targetHRZone: session?.targetHRZone ?? null,
              intensity: session?.intensity ?? "moderate",
              workoutSummary: session?.workoutSummary ?? null,
              elevationGain: session?.elevationGain ?? null,
              terrainType: session?.terrainType ?? null,
              exercises: session?.exercises ? JSON.stringify(session.exercises) : null,
              completed: isPastWeek,
            },
          });
        }
      }

      // Préserver les séances existantes que l'IA n'a pas générées
      // SAUF si l'IA demande explicitement leur suppression (avec justification)
      const existingWeek = weeksToDelete.find((w) => w.weekNumber === correctWeekNumber);
      if (existingWeek) {
        for (const existingSession of existingWeek.sessions) {
          if (!generatedDays.has(existingSession.dayOfWeek.toLowerCase())) {
            const deletionKey = `${correctWeekNumber}-${existingSession.dayOfWeek.toLowerCase()}`;
            const deletionReason = deletionsMap.get(deletionKey);

            if (deletionReason) {
              // L'IA demande explicitement la suppression avec justification
              // On ne crée pas la séance mais on note la suppression dans le snapshot
              // (le diff sera calculé automatiquement par comparePlanVersions)
              continue;
            }

            // Pas de suppression explicite → on préserve la séance
            mergedSessions.push({
              dayOfWeek: existingSession.dayOfWeek,
              sessionType: existingSession.sessionType,
              title: existingSession.title,
              description: existingSession.description,
              distance: existingSession.distance,
              duration: existingSession.duration,
              targetPace: existingSession.targetPace,
              targetHRZone: existingSession.targetHRZone,
              intensity: existingSession.intensity,
              workoutSummary: existingSession.workoutSummary,
              elevationGain: existingSession.elevationGain,
              terrainType: existingSession.terrainType,
              exercises: existingSession.exercises,
              changeReason: null,
            });

            await prisma.trainingSession.create({
              data: {
                weekId: dbWeek.id,
                sortOrder: sessionIndex++,
                dayOfWeek: existingSession.dayOfWeek,
                sessionType: existingSession.sessionType,
                title: existingSession.title,
                description: existingSession.description,
                distance: existingSession.distance,
                duration: existingSession.duration,
                targetPace: existingSession.targetPace,
                targetHRZone: existingSession.targetHRZone,
                intensity: existingSession.intensity,
                workoutSummary: existingSession.workoutSummary,
                elevationGain: existingSession.elevationGain,
                terrainType: existingSession.terrainType,
                exercises: existingSession.exercises,
                completed: isPastWeek || existingSession.completed,
              },
            });
          }
        }
      }

      mergedWeeksForSnapshot.push({
        weekNumber: correctWeekNumber,
        theme: week.theme ?? "Entraînement",
        totalVolume: week.totalVolume ?? null,
        sessions: mergedSessions,
      });
    }
  }

  // Restaurer les liens activité-session sauvegardés
  if (savedLinks.size > 0) {
    const newWeeks = await prisma.trainingWeek.findMany({
      where: { planId: plan.id },
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

  // Calculate new version number (max existant + 1 pour éviter les conflits)
  const maxVersion = await prisma.trainingPlanVersion.findFirst({
    where: { planId: plan.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const newVersionNumber = (maxVersion?.versionNumber ?? previousVersionNumber) + 1;

  // Build snapshot combining preserved completed weeks + newly generated weeks
  const completedWeeksSnapshot = completedWeeks.map((w) => ({
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
  }));

  // Utiliser les semaines mergées pour le snapshot (pas les valeurs IA originales)
  const generatedWeeksSnapshot = mergedWeeksForSnapshot.map((w) => ({
    weekNumber: w.weekNumber,
    theme: w.theme,
    totalVolume: w.totalVolume,
    sessions: w.sessions.map((s) => ({
      dayOfWeek: s.dayOfWeek ?? "lundi",
      sessionType: s.sessionType ?? "easy",
      title: s.title ?? "Séance",
      description: s.description ?? "",
      distance: s.distance ?? null,
      duration: s.duration ?? null,
      targetPace: s.targetPace ?? null,
      targetHRZone: s.targetHRZone ?? null,
      intensity: s.intensity ?? "moderate",
      workoutSummary: s.workoutSummary ?? null,
      elevationGain: s.elevationGain ?? null,
      terrainType: s.terrainType ?? null,
      exercises: s.exercises ?? null,
      changeReason: s.changeReason ?? undefined,
    })),
  }));

  // Combine and sort by week number
  const allWeeksSnapshot = [...completedWeeksSnapshot, ...generatedWeeksSnapshot]
    .sort((a, b) => a.weekNumber - b.weekNumber);

  // Convertir les suppressions explicites en array pour le snapshot
  const deletedSessions = Array.from(deletionsMap.entries()).map(([key, reason]) => {
    const [weekNum, day] = key.split("-");
    return {
      weekNumber: parseInt(weekNum, 10),
      dayOfWeek: day,
      reason,
    };
  });

  const newSnapshot: PlanSnapshot = {
    versionNumber: newVersionNumber,
    createdAt: new Date().toISOString(),
    goalProbability: generated.goalProbability ?? null,
    goalAssessment: generated.goalAssessment ?? null,
    weeks: allWeeksSnapshot,
    deletedSessions: deletedSessions.length > 0 ? deletedSessions : undefined,
  };

  // Calculate diff with previous version (only for non-completed weeks)
  let diff: VersionDiff | null = null;
  const previousVersion = await prisma.trainingPlanVersion.findUnique({
    where: { planId_versionNumber: { planId: plan.id, versionNumber: previousVersionNumber } },
  });

  if (previousVersion) {
    const previousSnapshot: PlanSnapshot = JSON.parse(previousVersion.snapshot);
    // Filter to only compare weeks that were regenerated (not completed)
    const completedWeekNumbers = new Set(completedWeeks.map((w) => w.weekNumber));
    const filteredPrevSnapshot: PlanSnapshot = {
      ...previousSnapshot,
      weeks: previousSnapshot.weeks.filter((w) => !completedWeekNumbers.has(w.weekNumber)),
    };
    const filteredNewSnapshot: PlanSnapshot = {
      ...newSnapshot,
      weeks: newSnapshot.weeks.filter((w) => !completedWeekNumbers.has(w.weekNumber)),
    };
    diff = computeVersionDiff(filteredPrevSnapshot, filteredNewSnapshot);
  }

  // Create new version with changelog
  await prisma.trainingPlanVersion.create({
    data: {
      planId: plan.id,
      versionNumber: newVersionNumber,
      snapshot: JSON.stringify(newSnapshot),
      triggerReason,
      changelogSummary: generated.changelog?.summary ?? null,
      changelogDetails: generated.changelog?.details ?? null,
      sessionsAdded: diff?.sessionsAdded ?? 0,
      sessionsRemoved: diff?.sessionsRemoved ?? 0,
      sessionsModified: diff?.sessionsModified ?? 0,
      volumeChange: diff?.volumeChange ?? null,
    },
  });

  // Update plan with new version number, goal data, and lastUpdatedAt
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: {
      currentVersion: newVersionNumber,
      goalProbability: generated.goalProbability ?? null,
      goalAssessment: generated.goalAssessment ?? null,
      lastUpdatedAt: now,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
    },
  });

  // Cleanup old versions
  await cleanupOldVersions(plan.id);

  return { planId: plan.id };
}

export async function updateSessionDisplayMode(
  sessionId: string,
  displayMode: "time" | "distance" | null
) {
  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { displayMode },
  });
}

// ============================================================================
// VERSION MANAGEMENT FUNCTIONS
// ============================================================================

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

