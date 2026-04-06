"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { createPlanSnapshot, cleanupOldVersions, computeVersionDiff, withRetry } from "./training-versions";
import { getUpdateSystemPrompt } from "./training-generate";
import type { PlanSnapshot, VersionDiff } from "@/types/training-version";

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
- Jours de course : ${plan.trainingDays ? JSON.parse(plan.trainingDays).join(", ") : `${plan.daysPerWeek} jours/semaine`}
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
- Jours de course : ${plan.trainingDays ? JSON.parse(plan.trainingDays).join(", ") : `${plan.daysPerWeek} jours/semaine`}
- Jour de sortie longue : ${plan.longRunDay}
- goalProbability actuel : ${plan.goalProbability ?? "N/A"}
- goalAssessment actuel : ${plan.goalAssessment ?? "N/A"}
${plan.targetTime ? `- Objectif/estimation chrono : ${plan.targetTime}` : ""}

Semaines passées (pour contexte, NE PAS régénérer) :
${JSON.stringify(completedSummary, null, 2)}

PLAN EXISTANT (JSON) — C'EST LA RÉFÉRENCE, COPIE-LE TEL QUEL SAUF AJUSTEMENT FATIGUE :
${existingWeeksJSON}

INSTRUCTION CRITIQUE :
- Retourne ce JSON IDENTIQUE par défaut (mêmes séances, mêmes jours, mêmes types, mêmes thèmes)
- Modifie UNIQUEMENT le volume (distance/durée) ou l'intensité de 2-3 séances SI les données de fatigue le justifient
- Ne change JAMAIS le type de séance, le jour, ou la structure du plan
- changeReason = null si aucune modification, sinon format : "[ancien] → [nouveau] car [données chiffrées de fatigue]"

Profil actuel du coureur :
- Volume hebdo : ${weeklyVolume.toFixed(1)} km
- Allure moyenne : ${avgPace > 0 ? Math.round(1000 / avgPace) : "N/A"} sec/km
- VO2max : ${latestVO2max ?? "N/A"}
- FC repos : ${plan.user.restingHR ?? "N/A"}
- FC max : ${plan.user.maxHR ?? "N/A"}
${newActivitiesSummary}
Génère les semaines ${currentWeekNumber} à ${currentWeekNumber + totalWeeksToGenerate - 1}.
Ajuste UNIQUEMENT en fonction de la fatigue observée. En l'absence de signal de fatigue, retourne le plan SANS modification.`;
  }

  const ai = new GoogleGenAI({ apiKey });

  const planningMode = ((plan as { planningMode?: string }).planningMode as "time" | "distance") || "time";

  const response = await withRetry(async () =>
    ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: await getUpdateSystemPrompt(planningMode),
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
    elevationGain?: number | null;
    terrainType?: string | null;
    exercises?: string | null;
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
    goalProbability: generated.goalProbability ?? plan.goalProbability ?? null,
    goalAssessment: generated.goalAssessment ?? plan.goalAssessment ?? null,
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
    diff = await computeVersionDiff(filteredPrevSnapshot, filteredNewSnapshot);
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
  // Conserver les valeurs existantes si Gemini ne les renvoie pas
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: {
      currentVersion: newVersionNumber,
      ...(generated.goalProbability != null ? { goalProbability: generated.goalProbability } : {}),
      ...(generated.goalAssessment ? { goalAssessment: generated.goalAssessment } : {}),
      lastUpdatedAt: now,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
    },
  });

  // Cleanup old versions
  await cleanupOldVersions(plan.id);

  return { planId: plan.id };
}
