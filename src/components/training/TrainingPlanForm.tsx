"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { generateTrainingPlan } from "@/actions/training";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [raceType, setRaceType] = useState("semi-marathon");
  const [raceDate, setRaceDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDistance, setTargetDistance] = useState("");
  const [targetElevation, setTargetElevation] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [longRunDay, setLongRunDay] = useState("dimanche");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await generateTrainingPlan({
        raceType,
        raceDate: raceDate || undefined,
        startDate: startDate || undefined,
        targetDistance: targetDistance ? Number(targetDistance) : undefined,
        targetElevation: targetElevation ? Number(targetElevation) : undefined,
        targetTime: targetTime || undefined,
        daysPerWeek,
        longRunDay,
      });

      router.push(`/dashboard/training/${result.planId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la génération"
      );
      setLoading(false);
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
          value={raceType}
          onChange={(e) => setRaceType(e.target.value)}
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
      {raceType === "trail" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Distance (km)
            </label>
            <input
              type="number"
              value={targetDistance}
              onChange={(e) => setTargetDistance(e.target.value)}
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
              value={targetElevation}
              onChange={(e) => setTargetElevation(e.target.value)}
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
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
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
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
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
          value={targetTime}
          onChange={(e) => setTargetTime(e.target.value)}
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
              onClick={() => setDaysPerWeek(d)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                daysPerWeek === d
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
          value={longRunDay}
          onChange={(e) => setLongRunDay(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {weekDays.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
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
