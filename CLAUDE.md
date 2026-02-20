# Stride Dashboard

Dashboard de course à pied : récupère les activités Garmin Connect et les analyse avec Google Gemini AI.

## Stack technique

- **Framework** : Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **API Garmin** : `garmin-connect` — connexion via credentials (username/password)
- **API IA** : `@google/genai` (SDK Google Gemini) — modèle `gemini-2.0-flash`
- **Icônes** : `lucide-react`
- **Alias** : `@/*` → `./src/*`

## Commandes

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run lint` — linting ESLint

## Structure du projet

```
src/
  types/garmin.ts              — Interfaces TypeScript (GarminActivity, FormattedActivity)
  lib/garmin-client.ts         — Singleton connexion Garmin (réutilise la session)
  lib/format.ts                — Formatage : distance, durée, allure, date (locale fr-FR)
  actions/garmin.ts            — Server Action : fetchGarminActivities (5 dernières courses)
  actions/gemini.ts            — Server Action : analyzeActivitiesWithGemini
  components/ActivityCard.tsx   — Carte d'activité (distance, durée, allure, FC)
  components/ActivityList.tsx   — Grille responsive de cartes
  components/AiAnalysis.tsx     — Client Component : bouton analyse + rendu markdown
  components/RefreshButton.tsx  — Client Component : router.refresh() avec animation
  components/LoadingSkeleton.tsx — Skeletons de chargement
  app/layout.tsx               — Layout racine (Inter font, lang="fr")
  app/page.tsx                 — Redirect vers /dashboard
  app/dashboard/page.tsx       — Page principale (Server Component, force-dynamic)
  app/dashboard/loading.tsx    — Loading boundary
```

## Conventions

- Server Actions dans `src/actions/` avec `"use server"`
- Client Components marqués `"use client"` uniquement quand nécessaire (interactivité)
- La page dashboard est `force-dynamic` pour toujours récupérer des données fraîches
- L'analyse Gemini est déclenchée manuellement (bouton) pour éviter les appels API inutiles
- Les données brutes Garmin (`rawActivities`) sont passées au composant AiAnalysis pour l'envoi à Gemini
- Formatage des dates en français (locale `fr-FR`)

## Variables d'environnement (.env.local)

- `GARMIN_USERNAME` — email du compte Garmin Connect
- `GARMIN_PASSWORD` — mot de passe Garmin Connect
- `GEMINI_API_KEY` — clé API Google Gemini
