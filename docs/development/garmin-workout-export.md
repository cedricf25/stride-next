# Export Workouts vers Garmin Connect

Documentation technique pour l'export de workouts structurés vers Garmin Connect.

## Structure de l'API (reverse engineered)

L'API Garmin Connect n'est pas documentée publiquement. Ces informations proviennent du reverse engineering.

### Step Types (stepTypeId)

| ID | Key | Description |
|----|-----|-------------|
| 1 | warmup | Echauffement |
| 2 | cooldown | Retour au calme |
| 3 | interval | Effort principal |
| 4 | recovery | Récupération |
| 5 | rest | Repos |
| 6 | repeat | Groupe de répétition |

### End Conditions (conditionTypeId)

| ID | Key | Description |
|----|-----|-------------|
| 1 | lap.button | Appui touche lap |
| 2 | time | Temps (secondes) |
| 3 | distance | Distance (mètres) |
| 7 | iterations | Nombre d'itérations |

### Structure JSON d'un workout

```json
{
  "workoutId": null,
  "workoutName": "STRIDE - VMA 6x1000m",
  "description": "...",
  "sportType": { "sportTypeId": 1, "sportTypeKey": "running" },
  "workoutSegments": [{
    "segmentOrder": 1,
    "sportType": { "sportTypeId": 1, "sportTypeKey": "running" },
    "workoutSteps": [...]
  }]
}
```

### ExecutableStepDTO (step simple)

```json
{
  "type": "ExecutableStepDTO",
  "stepId": null,
  "stepOrder": 1,
  "stepType": { "stepTypeId": 1, "stepTypeKey": "warmup" },
  "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
  "endConditionValue": 900,
  "preferredEndConditionUnit": null,
  "targetType": { "workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target" }
}
```

### RepeatGroupDTO (bloc de répétition)

```json
{
  "type": "RepeatGroupDTO",
  "stepId": null,
  "stepOrder": 2,
  "numberOfIterations": 6,
  "smartRepeat": false,
  "skipLastRestStep": true,
  "workoutSteps": [
    { "type": "ExecutableStepDTO", "stepType": { "stepTypeKey": "interval" }, ... },
    { "type": "ExecutableStepDTO", "stepType": { "stepTypeKey": "recovery" }, ... }
  ]
}
```

**Important** : Les steps enfants sont imbriqués dans `workoutSteps` du RepeatGroupDTO, pas référencés par `childStepId`.

### Options utiles

- `skipLastRestStep: true` : Ignore la dernière récupération du bloc (évite récup + retour au calme)
- `preferredEndConditionUnit: { unitKey: "meter" }` : Unité pour les distances
