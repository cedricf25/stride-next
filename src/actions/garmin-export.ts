"use server";

import { prisma } from "@/lib/prisma";
import { getGarminClient } from "@/lib/garmin-client";
import { getAuthenticatedUser } from "@/lib/user";

// Mapping des types de séances vers les noms courts pour Garmin
const sessionTypeShortNames: Record<string, string> = {
  easy: "EF",
  recovery: "Récup",
  tempo: "Seuil",
  interval: "VMA",
  long_run: "SL",
  rest: "Repos",
};

// Sport type pour course à pied
const SPORT_TYPE = {
  sportTypeId: 1,
  sportTypeKey: "running",
};

// Step types Garmin (basé sur reverse engineering)
const STEP_TYPES = {
  warmup: { stepTypeId: 1, stepTypeKey: "warmup" },
  cooldown: { stepTypeId: 2, stepTypeKey: "cooldown" },
  interval: { stepTypeId: 3, stepTypeKey: "interval" },
  recovery: { stepTypeId: 4, stepTypeKey: "recovery" },
  rest: { stepTypeId: 5, stepTypeKey: "rest" },
  repeat: { stepTypeId: 6, stepTypeKey: "repeat" },
};

// End conditions
const END_CONDITIONS = {
  lapButton: { conditionTypeId: 1, conditionTypeKey: "lap.button" },
  time: { conditionTypeId: 2, conditionTypeKey: "time" },
  distance: { conditionTypeId: 3, conditionTypeKey: "distance" },
  iterations: { conditionTypeId: 7, conditionTypeKey: "iterations" },
};

/**
 * Génère un nom court pour le workout Garmin
 */
function buildWorkoutName(session: {
  sessionType: string;
  workoutSummary: string | null;
  duration: number | null;
  distance: number | null;
}): string {
  const typePrefix = sessionTypeShortNames[session.sessionType] ?? session.sessionType;

  let name: string;
  if (session.workoutSummary) {
    const cleanSummary = session.workoutSummary.replace(/\s*Z\d(-Z\d)?/g, "").trim();
    name = `${typePrefix} ${cleanSummary}`;
  } else if (session.duration) {
    name = `${typePrefix} ${session.duration}'`;
  } else if (session.distance) {
    name = `${typePrefix} ${session.distance}km`;
  } else {
    name = typePrefix;
  }

  return `STRIDE - ${name}`;
}

/**
 * Parse le workoutSummary pour extraire les intervalles
 * Formats supportés: "6x1000m", "8x400m/200m", "3x10'/3'", "6x1000m allure cible"
 */
function parseWorkoutSummary(summary: string | null): {
  repetitions: number;
  effortDistance: number | null;
  effortDuration: number | null;
  recoveryDistance: number | null;
  recoveryDuration: number | null;
} | null {
  if (!summary) return null;

  const clean = summary.toLowerCase().replace(/\s+/g, "").replace(/×/g, "x");

  // Pattern: 6x1000m ou 6x1000m/200m ou 3x10'/3' ou 8x30''/30''
  const match = clean.match(
    /^(\d+)x(\d+)(m|km|'|''|min|sec)?(?:\/(\d+)(m|km|'|''|min|sec)?)?/
  );

  if (!match) return null;

  const repetitions = parseInt(match[1], 10);
  const effortValue = parseInt(match[2], 10);
  const effortUnit = match[3] || "m";
  const recoveryValue = match[4] ? parseInt(match[4], 10) : null;
  const recoveryUnit = match[5] || effortUnit;

  function toMetersOrSeconds(value: number, unit: string): { distance: number | null; duration: number | null } {
    switch (unit) {
      case "m":
        return { distance: value, duration: null };
      case "km":
        return { distance: value * 1000, duration: null };
      case "'":
      case "min":
        return { distance: null, duration: value * 60 };
      case "''":
      case "sec":
        return { distance: null, duration: value };
      default:
        return { distance: value, duration: null };
    }
  }

  const effort = toMetersOrSeconds(effortValue, effortUnit);
  const recovery = recoveryValue
    ? toMetersOrSeconds(recoveryValue, recoveryUnit)
    : { distance: null, duration: 90 }; // 1min30 de récup par défaut

  return {
    repetitions,
    effortDistance: effort.distance,
    effortDuration: effort.duration,
    recoveryDistance: recovery.distance,
    recoveryDuration: recovery.duration,
  };
}

// Type pour les steps exécutables
interface ExecutableStep {
  type: "ExecutableStepDTO";
  stepId: number | null;
  stepOrder: number;
  childStepId: number | null;
  description: string | null;
  stepType: { stepTypeId: number; stepTypeKey: string };
  endCondition: { conditionTypeId: number; conditionTypeKey: string };
  preferredEndConditionUnit: { unitKey: string } | null;
  endConditionValue: number | null;
  endConditionCompare: null;
  endConditionZone: null;
  targetType: { workoutTargetTypeId: number; workoutTargetTypeKey: string };
  targetValueOne: null;
  targetValueTwo: null;
  zoneNumber: null;
}

// Type pour les groupes de répétition
interface RepeatGroupStep {
  type: "RepeatGroupDTO";
  stepId: number | null;
  stepOrder: number;
  numberOfIterations: number;
  smartRepeat: boolean;
  childStepId: number | null;
  workoutSteps: ExecutableStep[];
  endConditionValue?: null;
}

type WorkoutStep = ExecutableStep | RepeatGroupStep;

/**
 * Crée un step exécutable
 */
function createExecutableStep(
  stepOrder: number,
  stepType: { stepTypeId: number; stepTypeKey: string },
  endCondition: { conditionTypeId: number; conditionTypeKey: string },
  endConditionValue: number | null,
  unitKey: string | null = null
): ExecutableStep {
  return {
    type: "ExecutableStepDTO",
    stepId: null,
    stepOrder,
    childStepId: null,
    description: null,
    stepType,
    endCondition,
    preferredEndConditionUnit: unitKey ? { unitKey } : null,
    endConditionValue,
    endConditionCompare: null,
    endConditionZone: null,
    targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" },
    targetValueOne: null,
    targetValueTwo: null,
    zoneNumber: null,
  };
}

/**
 * Crée un groupe de répétition avec ses steps enfants
 */
function createRepeatGroup(
  stepOrder: number,
  numberOfIterations: number,
  childSteps: ExecutableStep[]
): RepeatGroupStep {
  return {
    type: "RepeatGroupDTO",
    stepId: null,
    stepOrder,
    numberOfIterations,
    smartRepeat: false,
    childStepId: null,
    workoutSteps: childSteps,
    endConditionValue: null,
  };
}

/**
 * Crée un groupe de répétition avec l'option "Ignorer la dernière récupération"
 */
function createRepeatGroupWithSkipLastRecovery(
  stepOrder: number,
  numberOfIterations: number,
  childSteps: ExecutableStep[]
): RepeatGroupStep & { skipLastRestStep?: boolean } {
  return {
    ...createRepeatGroup(stepOrder, numberOfIterations, childSteps),
    skipLastRestStep: true,
  };
}

// Durées par défaut (en secondes)
const DEFAULT_WARMUP_DURATION = 15 * 60; // 15 minutes
const DEFAULT_COOLDOWN_DURATION = 10 * 60; // 10 minutes

/**
 * Construit les steps pour un workout structuré (fractionné)
 */
function buildIntervalSteps(parsed: NonNullable<ReturnType<typeof parseWorkoutSummary>>): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  let stepOrder = 1;

  // 1. Échauffement (10 min par défaut)
  steps.push(createExecutableStep(stepOrder++, STEP_TYPES.warmup, END_CONDITIONS.time, DEFAULT_WARMUP_DURATION));

  // 2. Créer les steps du repeat
  const repeatChildSteps: ExecutableStep[] = [];
  let childStepOrder = 1;

  // Effort
  if (parsed.effortDistance) {
    repeatChildSteps.push(createExecutableStep(childStepOrder++, STEP_TYPES.interval, END_CONDITIONS.distance, parsed.effortDistance, "meter"));
  } else if (parsed.effortDuration) {
    repeatChildSteps.push(createExecutableStep(childStepOrder++, STEP_TYPES.interval, END_CONDITIONS.time, parsed.effortDuration));
  }

  // Récupération
  if (parsed.recoveryDistance) {
    repeatChildSteps.push(createExecutableStep(childStepOrder++, STEP_TYPES.recovery, END_CONDITIONS.distance, parsed.recoveryDistance, "meter"));
  } else if (parsed.recoveryDuration) {
    repeatChildSteps.push(createExecutableStep(childStepOrder++, STEP_TYPES.recovery, END_CONDITIONS.time, parsed.recoveryDuration));
  }

  // Ajouter le repeat group avec ses enfants
  steps.push(createRepeatGroupWithSkipLastRecovery(stepOrder++, parsed.repetitions, repeatChildSteps));

  // 3. Retour au calme (10 min par défaut)
  steps.push(createExecutableStep(stepOrder++, STEP_TYPES.cooldown, END_CONDITIONS.time, DEFAULT_COOLDOWN_DURATION));

  return steps;
}

/**
 * Construit les steps pour une séance simple (EF, SL, récup)
 */
function buildSimpleSteps(session: {
  duration: number | null;
  distance: number | null;
}): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  let stepOrder = 1;

  // Échauffement (15 min)
  steps.push(createExecutableStep(stepOrder++, STEP_TYPES.warmup, END_CONDITIONS.time, DEFAULT_WARMUP_DURATION));

  // Corps principal
  if (session.duration) {
    // Si on a une durée, l'utiliser moins échauff+retour
    const mainDuration = Math.max(0, session.duration - 25) * 60; // -25min pour échauff(15)+retour(10)
    steps.push(createExecutableStep(stepOrder++, STEP_TYPES.interval, END_CONDITIONS.time, mainDuration));
  } else if (session.distance) {
    // Si on a une distance, l'utiliser moins échauff+retour (~2.5km)
    const mainDistance = Math.max(0, session.distance - 2.5) * 1000;
    steps.push(createExecutableStep(stepOrder++, STEP_TYPES.interval, END_CONDITIONS.distance, mainDistance, "meter"));
  } else {
    // Fallback: lap button
    steps.push(createExecutableStep(stepOrder++, STEP_TYPES.interval, END_CONDITIONS.lapButton, null));
  }

  // Retour au calme (10 min)
  steps.push(createExecutableStep(stepOrder++, STEP_TYPES.cooldown, END_CONDITIONS.time, DEFAULT_COOLDOWN_DURATION));

  return steps;
}

/**
 * Construit la description enrichie
 */
function buildDescription(session: {
  title: string;
  description: string;
  targetPace: string | null;
  targetHRZone: string | null;
  workoutSummary: string | null;
}): string {
  const parts: string[] = [session.title];
  if (session.description) parts.push(session.description);
  if (session.targetPace) parts.push(`Allure: ${session.targetPace}`);
  if (session.targetHRZone) parts.push(`Zone: ${session.targetHRZone}`);
  return parts.join(" | ");
}

/**
 * Construit un workout Garmin structuré
 */
function buildStructuredWorkout(session: {
  title: string;
  description: string;
  sessionType: string;
  distance: number | null;
  duration: number | null;
  targetPace: string | null;
  targetHRZone: string | null;
  workoutSummary: string | null;
}) {
  const parsedIntervals = parseWorkoutSummary(session.workoutSummary);

  // Construire les steps selon le type
  let workoutSteps: WorkoutStep[];
  if (parsedIntervals && (session.sessionType === "interval" || session.sessionType === "tempo")) {
    workoutSteps = buildIntervalSteps(parsedIntervals);
  } else {
    workoutSteps = buildSimpleSteps(session);
  }

  // Estimer la durée
  let estimatedDurationInSecs = 45 * 60;
  if (session.duration) {
    estimatedDurationInSecs = session.duration * 60;
  } else if (session.distance) {
    estimatedDurationInSecs = Math.round(session.distance * 6 * 60);
  }

  return {
    workoutId: null,
    ownerId: null,
    workoutName: buildWorkoutName(session),
    description: buildDescription(session),
    sportType: SPORT_TYPE,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: SPORT_TYPE,
        workoutSteps,
      },
    ],
    estimatedDurationInSecs,
    estimatedDistanceInMeters: null,
    poolLength: 0,
    poolLengthUnit: { unitId: null, unitKey: null, factor: null },
    shared: false,
  };
}

/**
 * Exporte une séance d'entraînement vers Garmin Connect
 */
export async function exportSessionToGarmin(sessionId: string): Promise<{
  success: boolean;
  workoutId?: string;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        week: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Séance introuvable" };
    }

    if (session.week.plan.userId !== user.id) {
      return { success: false, error: "Accès non autorisé" };
    }

    if (session.sessionType === "rest") {
      return { success: false, error: "Impossible d'exporter un jour de repos" };
    }

    const client = await getGarminClient();

    // Construire le workout structuré
    const workout = buildStructuredWorkout({
      title: session.title,
      description: session.description,
      sessionType: session.sessionType,
      distance: session.distance,
      duration: session.duration,
      targetPace: session.targetPace,
      targetHRZone: session.targetHRZone,
      workoutSummary: session.workoutSummary,
    });

    const result = await client.addWorkout(workout as never);

    return {
      success: true,
      workoutId: result.workoutId?.toString(),
    };
  } catch (error) {
    console.error("Erreur export Garmin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
