"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import type { TrainingPlanInput } from "./training";
import { matchActivitiesToPlans, autoMarkMissedSessions } from "./training";
import { getSessionDate } from "@/lib/training-utils";
import { createPlanSnapshot } from "./training-versions";

function getModeInstruction(planningMode: "time" | "distance"): string {
  return planningMode === "time"
    ? `Privilégie la DURÉE (minutes) pour chaque séance. Le champ "duration" est OBLIGATOIRE, "distance" est optionnel (fractionné sur piste uniquement).`
    : `Privilégie la DISTANCE (km) pour chaque séance. Le champ "distance" est OBLIGATOIRE (sauf repos), "duration" est optionnel.`;
}

function getSessionSchema(planningMode: "time" | "distance"): string {
  return `{
  "dayOfWeek": "lundi|mardi|...|dimanche",
  "sessionType": "easy|tempo|interval|long_run|recovery|strength",
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
  "estimatedTime": "string|null - OBLIGATOIRE pour trail : estimation réaliste du temps de course (ex: '5h30 - 6h15'). null pour les courses sur route si l'utilisateur a fourni un objectif chrono.",
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
- CRITIQUE : génère TOUTES les semaines demandées. Si le plan fait 8 semaines, le JSON DOIT contenir 8 objets dans "weeks". Ne jamais s'arrêter avant.
- Place les séances de course UNIQUEMENT sur les jours spécifiques demandés par l'athlète
- Place la sortie longue le jour demandé
- NE GÉNÈRE JAMAIS de séance de type "rest". Les jours sans séance sont implicitement des jours de repos. Ne les inclus PAS dans le JSON.
- Les jours non sélectionnés pour la course sont libres (renforcement musculaire si demandé, sinon rien)

Règles RENFORCEMENT MUSCULAIRE (si demandé) :
- CRITIQUE : génère EXACTEMENT le nombre de séances strength demandé, sur les jours LIBRES (hors jours de course)
- NE JAMAIS remplacer une séance de course par du renforcement. Les deux sont sur des jours différents.
- Les jours restants (ni course, ni renforcement) sont des jours de REPOS
- Si tous les 7 jours sont pris par la course, ne génère PAS de renforcement (préviens dans goalAssessment)
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
- ESTIMATION DE TEMPS : en trail l'utilisateur ne fournit PAS d'objectif chrono. Tu DOIS renseigner le champ "estimatedTime" avec une fourchette réaliste (ex: "5h30 - 6h15") basée sur : distance, D+, profil du coureur (VO2max, allure moyenne, poids). Formule indicative : ajoute environ 1 min/km par tranche de 100m D+/km en plus de l'allure route.

ALLURES TRAIL — RÈGLE CRITIQUE :
Les allures en trail doivent être SIGNIFICATIVEMENT plus lentes qu'en route. Ne donne JAMAIS des allures route pour des séances trail.
- targetPace en trail DOIT être adapté au terrain ET au dénivelé :
  • Sentier technique / montagne : +2:00 à +4:00/km par rapport à l'allure route (ex: si EF route = 5:30/km → sentier technique = 7:30-9:30/km)
  • Chemin / sentier : +1:00 à +2:00/km par rapport à l'allure route
  • Route (séance de récup en trail) : allure route normale
  • En montée raide (>15%) : l'athlète MARCHE, indique "marche active" ou allure > 10:00/km
- Ajoute environ +1:00/km par tranche de 50m de D+/km (ex: séance de 10km avec 500m D+ → +1:00/km de base + dénivelé)
- Préfère donner des FOURCHETTES d'allure plutôt qu'une allure fixe (ex: "7:00-8:30/km")
- En sortie longue trail, l'allure doit être CONFORTABLE : l'athlète doit pouvoir parler
- Utilise l'allure moyenne réelle du coureur (avgPaceSecPerKm) comme BASE et ralentis à partir de là, ne pars JAMAIS d'une allure théorique plus rapide`;
}

export async function getUpdateSystemPrompt(planningMode: "time" | "distance"): Promise<string> {
  return `Tu es un coach expert en course à pied. Tu mets à jour un plan d'entraînement existant.

${getModeInstruction(planningMode)}

RÈGLE N°1 — STABILITÉ : ton rôle est d'AJUSTER le plan existant, PAS de le réécrire.
- Le plan original (structure, types de séances, progression, thèmes) DOIT rester le même
- Tu ne modifies QUE l'intensité ou le volume de certaines séances, jamais la structure globale
- NE CHANGE PAS les types de séances (ex: ne transforme pas un easy en interval)
- NE CHANGE PAS les jours attribués
- NE CHANGE PAS les thèmes de semaine
- NE GÉNÈRE JAMAIS de séance de type "rest". Les jours sans séance sont implicitement des jours de repos.
- Max 2-3 séances modifiées par mise à jour

RÈGLE N°2 — ADAPTATION BASÉE SUR LA FATIGUE :
Le seul critère de modification est l'état de fatigue/forme de l'athlète :
- SIGNES DE FATIGUE (→ réduire volume/intensité de 10-15% sur les 2-3 prochaines séances) :
  • TE aérobie > 4.5 sur une séance facile
  • FC moyenne > 85% FCmax sur une séance facile/modérée
  • Distance ou durée réalisée bien inférieure au prévu (l'athlète n'a pas pu finir)
  • Plusieurs séances non réalisées, écourtées ou marquées comme "loupées" (missed=true)
- SIGNES DE FORME (→ augmenter légèrement de 5-10%) :
  • TE < 2.0 sur des séances modérées
  • FC bien en dessous des zones cibles
  • L'athlète dépasse régulièrement les séances prévues sans signe de surcharge
- PAS DE SIGNAL CLAIR → 0 modification, retourne le plan tel quel

- Adaptation PROGRESSIVE : ne jamais changer brutalement (ex: passer de 10km à 15km d'un coup)

Réponds UNIQUEMENT en JSON valide (pas de markdown), avec cette structure :
{
  "name": "string - IDENTIQUE au plan existant",
  "goalProbability": "number 0-100 - CONSERVE la valeur existante sauf si la fatigue change significativement la probabilité",
  "goalAssessment": "string - CONSERVE le texte existant sauf si la fatigue justifie une mise à jour",
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
- Si tu modifies une séance, adapte aussi son D+ et terrain si pertinent
- Les allures trail doivent rester réalistes : sentier/montagne = +2:00 à +4:00/km vs route, chemin = +1:00 à +2:00/km vs route
- Utilise l'allure moyenne RÉELLE du coureur comme base (pas une allure théorique)
- En montée raide, l'athlète marche : indique "marche active" ou > 10:00/km`;
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
      daysPerWeek: input.trainingDays.length,
      trainingDays: JSON.stringify(input.trainingDays),
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
${input.raceType === "trail" ? `- PAS d'objectif chrono fourni : estime un temps cible réaliste dans goalAssessment à partir du profil, de la distance et du D+` : input.targetTime ? `- Objectif chrono : ${input.targetTime}` : ""}
- Jours de COURSE choisis par l'athlète : ${input.trainingDays.join(", ")} (${input.trainingDays.length} jours)
- IMPORTANT : place les séances de course UNIQUEMENT sur ces jours précis. Respecte les jours choisis par l'athlète.
- Jour de sortie longue : ${input.longRunDay}
${input.includeStrength ? `- Séances de RENFORCEMENT MUSCULAIRE : ${input.strengthFrequency ?? 2} par semaine (sessionType: "strength"), à placer sur les jours LIBRES (hors jours de course). Jours disponibles : ${["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"].filter(d => !input.trainingDays.includes(d)).join(", ") || "aucun"}
- Les jours restants sont des jours de REPOS.` : ""}
- Durée totale du plan : EXACTEMENT ${totalWeeks} semaines (semaine 1 à semaine ${totalWeeks})
- CRITIQUE : le tableau "weeks" DOIT contenir EXACTEMENT ${totalWeeks} éléments, numérotés de 1 à ${totalWeeks}. Un plan incomplet est INVALIDE.
${pastWeeks > 0 ? `- Semaines déjà écoulées : ${pastWeeks} (les semaines 1 à ${pastWeeks} sont dans le passé, génère-les quand même pour montrer la progression rétrospective)` : ""}
${pastActivitiesSummary}
Profil du coureur :
${JSON.stringify(fitnessContext, null, 2)}

RAPPEL FINAL : génère les ${totalWeeks} semaines complètes (de la semaine 1 à la semaine ${totalWeeks}). Ne t'arrête PAS avant.`;

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: getCreateSystemPrompt(input.planningMode),
      responseMimeType: "application/json",
      maxOutputTokens: 65536,
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
      ...(generated.estimatedTime ? { targetTime: generated.estimatedTime } : {}),
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

      // Date d'hier (on ne marque comme "missed" que jusqu'à hier inclus)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      if (Array.isArray(week.sessions)) {
        // Filtrer les sessions rest — les jours sans séance sont implicitement repos
        const nonRestSessions = week.sessions.filter((s: { sessionType?: string }) => (s.sessionType ?? "easy") !== "rest");
        let sessionIndex = 0;
        for (const session of nonRestSessions) {
          const dayOfWeek = session.dayOfWeek ?? "lundi";
          const sessionType = session.sessionType ?? "easy";

          // Calculer si cette session est dans le passé (jour par jour, pas par semaine)
          let isPast = false;
          if (planStart && week.weekNumber <= pastWeeks + 1) {
            const sessionDate = getSessionDate(planStart, week.weekNumber, dayOfWeek);
            isPast = sessionDate <= yesterday;
          }

          await prisma.trainingSession.create({
            data: {
              weekId: dbWeek.id,
              sortOrder: sessionIndex++,
              dayOfWeek,
              sessionType,
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
              // Passé : marqué comme loupé (le sync corrigera si activité trouvée)
              completed: false,
              missed: isPast,
            },
          });
        }
      }
    }
  }

  // Matcher les activités existantes aux sessions (important si le plan commence dans le passé)
  await matchActivitiesToPlans();
  // Marquer comme loupées les sessions passées sans activité matchée
  await autoMarkMissedSessions();

  // Create initial version snapshot
  await createPlanSnapshot(plan.id, "initial");

  // Set lastUpdatedAt for future update checks
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { lastUpdatedAt: new Date() },
  });

  return { planId: plan.id };
}
