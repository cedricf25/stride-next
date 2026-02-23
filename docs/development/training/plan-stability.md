# Stabilité des plans d'entraînement

## Problème initial

Lors des mises à jour de plan, l'IA Gemini régénérait entièrement le plan même sans nouvelles activités, créant une instabilité pour l'utilisateur.

## Solution implémentée

### 1. Détection des changements (`checkForPlanUpdates`)

Avant toute mise à jour, le système vérifie si de nouvelles activités de course sont arrivées depuis `lastUpdatedAt`. Sans nouvelle activité, la mise à jour est bloquée (sauf `force=true`).

### 2. Préservation des séances existantes

Les séances existantes sont **toujours préservées** par défaut :
- Le merge garde les valeurs existantes (pas celles de l'IA)
- Les séances non générées par l'IA sont réinjectées

### 3. Suppressions explicites uniquement

L'IA ne peut supprimer une séance que via `sessionsToDelete` avec une raison obligatoire :

```json
{
  "sessionsToDelete": [
    { "weekNumber": 11, "dayOfWeek": "samedi", "reason": "Surcharge détectée" }
  ]
}
```

Sans raison explicite, la séance est conservée.

## Flux de mise à jour

```
Clic "Adapter" → checkForPlanUpdates()
    ├─ Pas de nouvelle activité → "Aucune modification nécessaire"
    └─ Nouvelles activités → Régénération avec merge + préservation
```

## Champs clés

- `TrainingPlan.lastUpdatedAt` : date de dernière mise à jour
- `PlanSnapshot.deletedSessions` : suppressions explicites avec raisons
