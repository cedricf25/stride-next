# Stride Dashboard

Dashboard de course à pied : récupère les activités Garmin Connect, les persiste en MariaDB, et les analyse avec Google Gemini AI. Inclut le suivi santé et la génération de plans d'entraînement IA.

## Stack technique

- **Framework** : Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **BDD** : MariaDB via Prisma 7 (`@prisma/adapter-mariadb`)
- **API Garmin** : `garmin-connect` — connexion via credentials (username/password)
- **API IA** : `@google/genai` (SDK Google Gemini) — modèle `gemini-2.0-flash`
- **Icônes** : `lucide-react`
- **Alias** : `@/*` → `./src/*`

## Commandes

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run lint` — linting ESLint
- `npm run db:push` — synchronise le schéma Prisma vers MariaDB
- `npm run db:seed` — seed de l'utilisateur par défaut
- `npm run db:studio` — Prisma Studio (GUI)

## Architecture

**Sync-then-read** : les pages lisent la DB (jamais l'API Garmin directement). Le bouton "Synchroniser" dans la sidebar déclenche `syncAll()` qui :

1. Récupère les activités Garmin → upsert dans `Activity` + `ActivitySplit`
2. Récupère le sommeil → upsert dans `SleepRecord`
3. Récupère les métriques santé → upsert dans `HealthMetric`
4. Met à jour le profil utilisateur

## Structure du projet

```
prisma/
  schema.prisma              — 9 modèles (User, Activity, ActivitySplit, ActivityAnalysis, SleepRecord, HealthMetric, TrainingPlan, TrainingWeek, TrainingSession)
  seed.ts                    — Seed utilisateur par défaut
src/
  generated/prisma/          — Client Prisma généré (ne pas modifier)
  types/garmin.ts            — Interfaces TypeScript (GarminActivity, FormattedActivity)
  lib/
    prisma.ts                — Singleton PrismaClient (MariaDB adapter)
    garmin-client.ts         — Singleton connexion Garmin
    format.ts                — Formatage : distance, durée, allure, date (fr-FR)
    chart-utils.ts           — Utilitaires SVG (polylinePath, scaleLinear)
    user.ts                  — Helper getOrCreateUser
  actions/
    garmin.ts                — fetchGarminActivities (lit DB), fetchActivityDetail
    gemini.ts                — analyzeActivity (cache), analyzeGlobalCoaching (enrichi)
    sync.ts                  — syncActivities, syncSleepData, syncHealthMetrics, syncUserProfile, syncAll
    health.ts                — fetchLatestHealthSummary, fetchSleepHistory, fetchHealthHistory
    training.ts              — generateTrainingPlan, fetchTrainingPlans, fetchTrainingPlan, toggleSessionCompleted
  components/
    Sidebar.tsx              — Navigation + SyncButton
    SyncButton.tsx           — Bouton synchronisation Garmin → DB
    ActivityCard.tsx         — Carte cliquable (distance, durée, allure, FC, training effect)
    ActivityList.tsx         — Grille responsive de cartes
    AiAnalysis.tsx           — Coaching IA global (charge, récupération, sommeil, plan)
    LoadingSkeleton.tsx      — Skeletons de chargement
    activity/
      ActivityDetailHeader.tsx — En-tête + stats principales
      SplitTable.tsx          — Tableau splits/km avec best/worst colorés
      RunningDynamics.tsx     — Barres visuelles cadence, foulée, GCT, oscillation
      TrainingEffectCard.tsx  — Gauges aérobie/anaérobie + TSS, IF, VO2max
      ActivityAiAnalysis.tsx  — Analyse IA individuelle avec cache
    health/
      HealthSummaryWidgets.tsx — Widgets compacts (sommeil, FC, pas, poids)
      SleepChart.tsx          — Barres empilées deep/light/REM/awake
      HrvChart.tsx            — Ligne HRV nocturne 30j
      RestingHRChart.tsx      — FC repos + moyenne glissante 7j
      WeightChart.tsx         — Poids + % masse grasse
      StepsChart.tsx          — Barres pas quotidiens + moyenne
      BodyBatteryCard.tsx     — Gauge Body Battery + variation nocturne
    training/
      TrainingPlanForm.tsx    — Formulaire création plan (type, date, objectif, jours)
      TrainingPlanHeader.tsx  — Résumé plan + barre progression
      TrainingWeekCard.tsx    — Semaine dépliable avec sessions
      TrainingSessionCard.tsx — Séance colorée par type + checkbox complété
  app/
    layout.tsx               — Layout racine (Inter font, lang="fr")
    page.tsx                 — Redirect vers /dashboard
    dashboard/
      layout.tsx             — Layout avec Sidebar
      page.tsx               — Dashboard (widgets santé + activités + coaching IA)
      loading.tsx            — Loading boundary
      activity/[id]/page.tsx — Détail activité (splits, dynamique, TE, analyse IA)
      health/page.tsx        — Graphiques santé 30j (sommeil, HRV, FC, poids, pas)
      training/
        page.tsx             — Liste des plans + bouton nouveau
        new/page.tsx         — Formulaire nouveau plan
        [id]/page.tsx        — Vue plan détaillé (semaines + sessions)
```

## Conventions

- Server Actions dans `src/actions/` avec `"use server"`
- Client Components marqués `"use client"` uniquement quand nécessaire (interactivité)
- Les pages dashboard sont `force-dynamic` pour toujours récupérer des données fraîches
- L'analyse Gemini est déclenchée manuellement (bouton) pour éviter les appels API inutiles
- Les analyses individuelles sont cachées dans `ActivityAnalysis` (1 appel Gemini par activité)
- Graphiques SVG inline + Tailwind (pas de lib de charts externe)
- Formatage des dates en français (locale `fr-FR`)
- Plans d'entraînement générés par Gemini en JSON structuré (`responseMimeType: "application/json"`)

- Ne recompile pas toi meme
- Ne vérifie pas que ca compile a chaque fois

## Variables d'environnement (.env.local)

- `GARMIN_USERNAME` — email du compte Garmin Connect
- `GARMIN_PASSWORD` — mot de passe Garmin Connect
- `GEMINI_API_KEY` — clé API Google Gemini
- `DATABASE_URL` — URL de connexion MariaDB (ex: `mysql://user:pass@localhost:3307/stride`)
