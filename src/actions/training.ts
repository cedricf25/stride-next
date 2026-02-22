"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";

export interface TrainingPlanInput {
  raceType: string;
  raceDate?: string;
  startDate?: string;
  targetDistance?: number;
  targetElevation?: number;
  targetTime?: string;
  daysPerWeek: number;
  longRunDay: string;
}

const TRAINING_SYSTEM_PROMPT = `Tu es un coach expert en course à pied. Tu génères des plans d'entraînement structurés et personnalisés.

IMPORTANT : Privilégie la durée (en minutes) pour définir chaque séance, sauf pour les séances de fractionné sur piste où la distance est pertinente (ex: 10x400m). Le champ duration est obligatoire, le champ distance est optionnel.

Tu dois répondre UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaires), respectant exactement cette structure :
{
  "name": "string - nom du plan",
  "goalProbability": number, // 0-100, probabilité estimée d'atteindre l'objectif
  "goalAssessment": "string - évaluation courte (2-3 phrases) de la faisabilité de l'objectif",
  "weeks": [
    {
      "weekNumber": number,
      "theme": "string - thème de la semaine (Base, Développement, Spécifique, Affûtage, etc.)",
      "totalVolume": number, // km prévus
      "sessions": [
        {
          "dayOfWeek": "string - lundi/mardi/.../dimanche",
          "sessionType": "easy|tempo|interval|long_run|recovery|rest",
          "title": "string - titre court",
          "description": "string - description détaillée de la séance avec durée ou distance selon le type",
          "distance": number | null, // km (optionnel, surtout pour fractionné piste)
          "duration": number, // minutes (obligatoire)
          "targetPace": "string | null - ex: 5:30 /km",
          "targetHRZone": "string | null - ex: Z2, Z3-Z4",
          "intensity": "low|moderate|high|very_high"
        }
      ]
    }
  ]
}

Le goalProbability doit être basé sur : le niveau actuel du coureur (volume hebdo, allure, VO2max), l'objectif visé, le temps de préparation disponible, et l'historique d'entraînement.

Adapte le plan au niveau du coureur basé sur ses données récentes.
Respecte le nombre de jours d'entraînement demandé.
Place la sortie longue le jour demandé.
Inclus des jours de repos.`;

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
- Jours d'entraînement par semaine : ${input.daysPerWeek}
- Jour de sortie longue : ${input.longRunDay}
- Durée totale du plan : ${totalWeeks} semaines
${pastWeeks > 0 ? `- Semaines déjà écoulées : ${pastWeeks} (les semaines 1 à ${pastWeeks} sont dans le passé, génère-les quand même pour montrer la progression rétrospective)` : ""}
${pastActivitiesSummary}
Profil du coureur :
${JSON.stringify(fitnessContext, null, 2)}`;

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: TRAINING_SYSTEM_PROMPT,
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
        for (const session of week.sessions) {
          await prisma.trainingSession.create({
            data: {
              weekId: dbWeek.id,
              dayOfWeek: session.dayOfWeek ?? "lundi",
              sessionType: session.sessionType ?? "easy",
              title: session.title ?? "Séance",
              description: session.description ?? "",
              distance: session.distance ?? null,
              duration: session.duration ?? null,
              targetPace: session.targetPace ?? null,
              targetHRZone: session.targetHRZone ?? null,
              intensity: session.intensity ?? "moderate",
              completed: isPastWeek,
            },
          });
        }
      }
    }
  }

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
        include: { sessions: true },
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

export async function updateTrainingPlan(
  planId: string,
  startDate?: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set");

  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      user: true,
      weeks: {
        include: { sessions: true },
        orderBy: { weekNumber: "asc" },
      },
    },
  });
  if (!plan) throw new Error("Plan introuvable");

  const now = new Date();
  const isBackfill = !!startDate;
  const planStart = startDate ? new Date(startDate) : null;

  // Calculer les semaines passées si backfill
  let pastWeeks = 0;
  if (planStart && planStart < now) {
    pastWeeks = Math.max(
      1,
      Math.round((now.getTime() - planStart.getTime()) / (7 * 24 * 3600 * 1000))
    );
  }

  // Séparer semaines complétées vs non complétées
  const completedWeeks = isBackfill
    ? [] // On régénère tout si backfill
    : plan.weeks.filter((w) =>
        w.sessions.every((s) => s.completed || s.sessionType === "rest")
      );
  const weeksToDelete = isBackfill
    ? plan.weeks // Tout supprimer si backfill
    : plan.weeks.filter(
        (w) => !w.sessions.every((s) => s.completed || s.sessionType === "rest")
      );

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

Mets à jour un plan d'entraînement existant en régénérant les semaines restantes.

Plan original :
- Nom : ${plan.name}
- Type de course : ${plan.raceType}
${plan.targetTime ? `- Objectif chrono : ${plan.targetTime}` : ""}
${plan.raceDate ? `- Date de course : ${new Date(plan.raceDate).toLocaleDateString("fr-FR")}` : ""}
- Jours d'entraînement par semaine : ${plan.daysPerWeek}
- Jour de sortie longue : ${plan.longRunDay}

Semaines complétées (à ne PAS régénérer, pour contexte uniquement) :
${JSON.stringify(completedSummary, null, 2)}

Profil actuel du coureur :
- Volume hebdo : ${weeklyVolume.toFixed(1)} km
- Allure moyenne : ${avgPace > 0 ? Math.round(1000 / avgPace) : "N/A"} sec/km
- VO2max : ${latestVO2max ?? "N/A"}
- FC repos : ${plan.user.restingHR ?? "N/A"}
- FC max : ${plan.user.maxHR ?? "N/A"}

Semaines restantes à générer : ${totalWeeksToGenerate}
Numérotation des semaines à partir de : ${completedWeeks.length + 1}

Génère UNIQUEMENT les semaines restantes (pas les semaines déjà complétées).
Adapte la charge en fonction de la progression réelle du coureur.`;
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: TRAINING_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const text = response.text ?? "{}";
  const generated = JSON.parse(text);

  // Supprimer les semaines concernées
  for (const week of weeksToDelete) {
    await prisma.trainingWeek.delete({ where: { id: week.id } });
  }

  // Créer les nouvelles semaines
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

      const isPastWeek = isBackfill && week.weekNumber <= pastWeeks;

      if (Array.isArray(week.sessions)) {
        for (const session of week.sessions) {
          await prisma.trainingSession.create({
            data: {
              weekId: dbWeek.id,
              dayOfWeek: session.dayOfWeek ?? "lundi",
              sessionType: session.sessionType ?? "easy",
              title: session.title ?? "Séance",
              description: session.description ?? "",
              distance: session.distance ?? null,
              duration: session.duration ?? null,
              targetPace: session.targetPace ?? null,
              targetHRZone: session.targetHRZone ?? null,
              intensity: session.intensity ?? "moderate",
              completed: isPastWeek,
            },
          });
        }
      }
    }
  }

  // Mettre à jour le score de probabilité + startDate
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: {
      goalProbability: generated.goalProbability ?? null,
      goalAssessment: generated.goalAssessment ?? null,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
    },
  });

  return { planId: plan.id };
}
