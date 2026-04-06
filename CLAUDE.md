# Stride Dashboard

Dashboard de course à pied : récupère les activités Garmin Connect, les persiste en MariaDB, et les analyse avec Google Gemini AI. Inclut le suivi santé, la génération de plans d'entraînement IA, le suivi nutritionnel par photo IA, et les prédictions de course.

## Stack technique

- **Framework** : Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **BDD** : MariaDB via Prisma 7 (`@prisma/adapter-mariadb`)
- **Auth** : `better-auth` (email/password + Google OAuth)
- **API Garmin** : `garmin-connect` — connexion via credentials (username/password)
- **API IA** : `@google/genai` (SDK Google Gemini) — `gemini-3.1-pro-preview` (plans), `gemini-3.1-flash-lite-preview` (analyses, nutrition, prédictions)
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

**Authentification** : Better Auth avec route groups — `(auth)/` pour login/signup (layout centré), `(dashboard)/` pour les pages protégées (layout avec Sidebar). Middleware protège les routes via cookie de session.

## Structure du projet

```
prisma/
  schema.prisma              — 21 modèles (voir section Modèles)
  seed.ts                    — Seed utilisateur par défaut
src/
  generated/prisma/          — Client Prisma généré (ne pas modifier)
  types/garmin.ts            — Interfaces TypeScript (GarminActivity, FormattedActivity)
  lib/
    prisma.ts                — Singleton PrismaClient (MariaDB adapter)
    garmin-client.ts         — Singleton connexion Garmin
    auth.ts                  — Config Better Auth serveur
    auth-client.ts           — Config Better Auth client (signIn, signUp, signOut, useSession)
    format.ts                — Formatage : distance, durée, allure, date (fr-FR)
    chart-utils.ts           — Utilitaires SVG (polylinePath, scaleLinear)
    user.ts                  — getAuthenticatedUser (session → user DB)
  actions/                   — Server Actions découpées par domaine
    garmin.ts                — fetchGarminActivities, fetchActivityDetail
    garmin-export.ts         — Export données Garmin
    gemini.ts                — analyzeActivity, analyzeGlobalCoaching
    gemini-health.ts         — Analyses IA santé (sommeil, HRV, stress)
    sync.ts                  — syncAll (coordination)
    sync-health.ts           — syncSleepData, syncHealthMetrics
    health.ts                — fetchLatestHealthSummary, fetchSleepHistory, fetchHealthHistory
    training.ts              — fetchTrainingPlans, fetchTrainingPlan, toggleSessionCompleted
    training-generate.ts     — generateTrainingPlan (Gemini Pro)
    training-update.ts       — updateTrainingPlan (Gemini Pro)
    training-versions.ts     — Gestion versions de plans
    nutrition.ts             — CRUD repas, aliments, favoris
    nutrition-ai.ts          — Analyse photo IA, recommandations nutritionnelles
    predictions.ts           — fetchPredictions
    predictions-generate.ts  — generateRacePredictions (Gemini Flash Lite)
    settings.ts              — Gestion paramètres utilisateur
  components/
    shared/                  — Composants UI réutilisables (Card, EmptyState, StatItem, ProgressBar, etc.)
    Sidebar.tsx              — Navigation + SyncButton + UserMenu
    MobileHeader.tsx         — Header mobile
    SyncButton.tsx           — Bouton synchronisation Garmin → DB
    ActivityCard.tsx         — Carte cliquable (distance, durée, allure, FC, training effect)
    ActivityList.tsx         — Grille responsive de cartes
    AiAnalysis.tsx           — Coaching IA global
    activity/                — Détail activité (header, splits, dynamique, TE, allure, intervalles, analyse IA)
    activities/              — Filtres et résultats liste activités
    health/                  — Graphiques santé (sommeil, HRV, FC, poids, pas, stress, Body Battery, analyses IA)
    training/                — Plans (formulaire, header, semaines, sessions, drag-and-drop, versioning, fatigue, zones)
    predictions/             — Prédictions de course (cartes, historique, évolution, comparaison)
    nutrition/               — Suivi nutritionnel (repas, aliments, photo IA, macros, historique, favoris, objectifs)
    settings/                — Paramètres (thème, Garmin, resync)
  hooks/                     — useAsyncAction, useLocalStorage, useAiAnalysis
  reducers/                  — trainingPlanFormReducer
  app/
    layout.tsx               — Layout racine (Inter font, lang="fr")
    page.tsx                 — Redirect vers dashboard
    api/auth/[...all]/       — Route handler Better Auth
    (auth)/                  — Route group public (login, signup)
    (dashboard)/             — Route group protégé (layout avec Sidebar)
      page.tsx               — Dashboard (widgets santé + activités + coaching IA)
      activities/            — Liste + détail activité
      health/                — Pages santé par métrique (sommeil, HRV, FC, poids, pas, stress, Body Battery)
      training/              — Plans d'entraînement (liste, nouveau, détail, versions, debug)
      nutrition/             — Suivi nutritionnel (jour, ajout, photo, favoris, historique, objectifs)
      predictions/           — Prédictions de course
      settings/              — Paramètres utilisateur
  middleware.ts              — Protection routes via session Better Auth
```

### Modèles Prisma (21)

- **Auth** : User, Session, Account, Verification
- **Activités** : Activity, ActivitySplit, ActivityAnalysis, ActivityInterval
- **Santé** : SleepRecord, HealthMetric, HealthAnalysis
- **Entraînement** : TrainingPlan, TrainingPlanVersion, TrainingWeek, TrainingSession
- **Nutrition** : NutritionGoal, Meal, Food, FavoriteMeal, MealAnalysis, NutritionAnalysis
- **Prédictions** : RacePredictionBatch, RacePrediction

## Conventions

- Server Actions dans `src/actions/` avec `"use server"`, découpées par domaine (1 fichier = 1 responsabilité)
- Client Components marqués `"use client"` uniquement quand nécessaire (interactivité)
- Les pages dashboard sont `force-dynamic` pour toujours récupérer des données fraîches
- L'analyse Gemini est déclenchée manuellement (bouton) pour éviter les appels API inutiles
- Les analyses individuelles sont cachées en DB (1 appel Gemini par activité/repas)
- Graphiques SVG inline + Tailwind (pas de lib de charts externe)
- Formatage des dates en français (locale `fr-FR`)
- Plans d'entraînement générés par Gemini en JSON structuré (`responseMimeType: "application/json"`)
- Modèle Gemini Pro pour les tâches complexes (plans), Flash Lite pour les analyses rapides
- `maxDuration: 120` sur les Server Actions de génération IA longues
- Composants UI partagés dans `src/components/shared/` avec barrel export
- Hooks custom dans `src/hooks/` avec barrel export

- Ne recompile pas toi meme
- Ne vérifie pas que ca compile a chaque fois

## Variables d'environnement (.env.local)

- `GARMIN_USERNAME` — email du compte Garmin Connect
- `GARMIN_PASSWORD` — mot de passe Garmin Connect
- `GEMINI_API_KEY` — clé API Google Gemini
- `DATABASE_URL` — URL de connexion MariaDB (ex: `mysql://user:pass@localhost:3307/stride`)
- `BETTER_AUTH_URL` — URL de l'app (ex: `http://localhost:3000`)
- `BETTER_AUTH_SECRET` — Secret pour Better Auth
- `NEXT_PUBLIC_BETTER_AUTH_URL` — URL publique pour le client auth
- `GOOGLE_CLIENT_ID` — Client ID Google OAuth
- `GOOGLE_CLIENT_SECRET` — Client Secret Google OAuth
