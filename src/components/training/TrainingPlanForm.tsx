"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import { generateTrainingPlan } from "@/actions/training";
import {
  trainingPlanFormReducer,
  initialState,
} from "@/reducers/trainingPlanFormReducer";
import {
  Button,
  FormField,
  Input,
  Select,
  AlertBanner,
} from "@/components/shared";

const raceTypes = [
  { value: "10km", label: "10 km" },
  { value: "semi-marathon", label: "Semi-marathon" },
  { value: "marathon", label: "Marathon" },
  { value: "trail", label: "Trail" },
];

const daysOptions = [3, 4, 5, 6];

const weekDays = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

export default function TrainingPlanForm() {
  const router = useRouter();
  const [state, dispatch] = useReducer(trainingPlanFormReducer, initialState);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SET_LOADING", value: true });

    try {
      const result = await generateTrainingPlan({
        raceType: state.raceType,
        raceDate: state.raceDate || undefined,
        startDate: state.startDate || undefined,
        targetDistance: state.targetDistance ? Number(state.targetDistance) : undefined,
        targetElevation: state.targetElevation ? Number(state.targetElevation) : undefined,
        targetTime: state.targetTime || undefined,
        daysPerWeek: state.daysPerWeek,
        longRunDay: state.longRunDay,
        planningMode: state.planningMode,
        includeStrength: state.includeStrength,
        strengthFrequency: state.includeStrength ? state.strengthFrequency : undefined,
      });

      router.push(`/training/${result.planId}`);
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        value: err instanceof Error ? err.message : "Erreur lors de la génération",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Race type */}
      <FormField label="Type de course" htmlFor="race-type">
        <Select
          id="race-type"
          value={state.raceType}
          onChange={(e) => dispatch({ type: "SET_RACE_TYPE", value: e.target.value })}
        >
          {raceTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Trail-specific fields */}
      {state.raceType === "trail" && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Distance (km)" htmlFor="target-distance">
            <Input
              id="target-distance"
              type="number"
              value={state.targetDistance}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetDistance", value: e.target.value })}
              placeholder="ex: 42"
            />
          </FormField>
          <FormField label="D+ (m)" htmlFor="target-elevation">
            <Input
              id="target-elevation"
              type="number"
              value={state.targetElevation}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetElevation", value: e.target.value })}
              placeholder="ex: 2000"
            />
          </FormField>
        </div>
      )}

      {/* Race date */}
      <FormField label="Date de la course" htmlFor="race-date" labelSuffix="(optionnel)">
        <Input
          id="race-date"
          type="date"
          value={state.raceDate}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "raceDate", value: e.target.value })}
        />
      </FormField>

      {/* Start date */}
      <FormField label="Début de la préparation" htmlFor="start-date" labelSuffix="(optionnel)">
        <Input
          id="start-date"
          type="date"
          value={state.startDate}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "startDate", value: e.target.value })}
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Si tu t&apos;entraînes déjà, indique la date de début. Les semaines
          passées seront incluses et marquées comme complétées.
        </p>
      </FormField>

      {/* Target time */}
      <FormField label="Objectif chrono" htmlFor="target-time" labelSuffix="(optionnel)">
        <Input
          id="target-time"
          type="text"
          value={state.targetTime}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetTime", value: e.target.value })}
          placeholder="ex: 1h45"
        />
      </FormField>

      {/* Days per week */}
      <FormField label="Jours d&apos;entraînement par semaine">
        <div className="flex gap-2">
          {daysOptions.map((d) => (
            <Button
              key={d}
              type="button"
              variant={state.daysPerWeek === d ? "primary" : "secondary"}
              onClick={() => dispatch({ type: "SET_FIELD", field: "daysPerWeek", value: d })}
            >
              {d}
            </Button>
          ))}
        </div>
      </FormField>

      {/* Long run day */}
      <FormField label="Jour de sortie longue" htmlFor="long-run-day">
        <Select
          id="long-run-day"
          value={state.longRunDay}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "longRunDay", value: e.target.value })}
          className="capitalize"
        >
          {weekDays.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Strength training */}
      <FormField label="Renforcement musculaire">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.includeStrength}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "includeStrength", value: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
          />
          <span className="text-sm">Inclure du renforcement musculaire</span>
        </label>
        {state.includeStrength && (
          <div className="mt-3">
            <p className="text-xs text-[var(--text-muted)] mb-2">Nombre de séances par semaine</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={state.strengthFrequency === n ? "primary" : "secondary"}
                  onClick={() => dispatch({ type: "SET_FIELD", field: "strengthFrequency", value: n })}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        )}
      </FormField>

      {/* Planning mode */}
      <FormField label="Planifier les séances par">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={state.planningMode === "time" ? "primary" : "secondary"}
            onClick={() => dispatch({ type: "SET_FIELD", field: "planningMode", value: "time" })}
          >
            Temps
          </Button>
          <Button
            type="button"
            variant={state.planningMode === "distance" ? "primary" : "secondary"}
            onClick={() => dispatch({ type: "SET_FIELD", field: "planningMode", value: "distance" })}
          >
            Distance
          </Button>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Tu pourras ajuster chaque séance individuellement via le menu ⋮
        </p>
      </FormField>

      {state.error && (
        <AlertBanner variant="error">{state.error}</AlertBanner>
      )}

      <Button type="submit" fullWidth size="lg" loading={state.loading}>
        {state.loading ? "Génération du plan en cours..." : "Générer le plan"}
      </Button>
    </form>
  );
}
