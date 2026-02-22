"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { generateTrainingPlan } from "@/actions/training";
import {
  trainingPlanFormReducer,
  initialState,
} from "@/reducers/trainingPlanFormReducer";

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
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Type de course
        </label>
        <select
          value={state.raceType}
          onChange={(e) => dispatch({ type: "SET_RACE_TYPE", value: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {raceTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trail-specific fields */}
      {state.raceType === "trail" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Distance (km)
            </label>
            <input
              type="number"
              value={state.targetDistance}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetDistance", value: e.target.value })}
              placeholder="ex: 42"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              D+ (m)
            </label>
            <input
              type="number"
              value={state.targetElevation}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetElevation", value: e.target.value })}
              placeholder="ex: 2000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Race date */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Date de la course <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          type="date"
          value={state.raceDate}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "raceDate", value: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Start date */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Début de la préparation{" "}
          <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          type="date"
          value={state.startDate}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "startDate", value: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Si tu t&apos;entraînes déjà, indique la date de début. Les semaines
          passées seront incluses et marquées comme complétées.
        </p>
      </div>

      {/* Target time */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Objectif chrono <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          type="text"
          value={state.targetTime}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetTime", value: e.target.value })}
          placeholder="ex: 1h45"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Days per week */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Jours d&apos;entraînement par semaine
        </label>
        <div className="flex gap-2">
          {daysOptions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => dispatch({ type: "SET_FIELD", field: "daysPerWeek", value: d })}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                state.daysPerWeek === d
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Long run day */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Jour de sortie longue
        </label>
        <select
          value={state.longRunDay}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "longRunDay", value: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {weekDays.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={state.loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {state.loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération du plan en cours...
          </>
        ) : (
          "Générer le plan"
        )}
      </button>
    </form>
  );
}
