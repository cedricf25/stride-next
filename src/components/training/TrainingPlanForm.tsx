"use client";

import { useReducer, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateTrainingPlan } from "@/actions/training-generate";
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
  Card,
} from "@/components/shared";
import {
  Timer,
  Ruler,
  Dumbbell,
  Sparkles,
} from "lucide-react";

const raceTypes = [
  { value: "10km", label: "10 km", icon: "🏃", desc: "Vitesse & intensité" },
  { value: "semi-marathon", label: "Semi-marathon", icon: "🏅", desc: "Endurance & seuil" },
  { value: "marathon", label: "Marathon", icon: "🏆", desc: "Endurance fondamentale" },
  { value: "trail", label: "Trail", icon: "⛰️", desc: "Dénivelé & technique" },
];

const weekDays = [
  { value: "lundi", label: "Lun" },
  { value: "mardi", label: "Mar" },
  { value: "mercredi", label: "Mer" },
  { value: "jeudi", label: "Jeu" },
  { value: "vendredi", label: "Ven" },
  { value: "samedi", label: "Sam" },
  { value: "dimanche", label: "Dim" },
];

export default function TrainingPlanForm() {
  const router = useRouter();
  const [state, dispatch] = useReducer(trainingPlanFormReducer, initialState);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.loading]);

  const freeDays = weekDays.filter((d) => !state.trainingDays.includes(d.value));
  const strengthCount = state.includeStrength ? Math.min(state.strengthFrequency, freeDays.length) : 0;
  const restDays = 7 - state.trainingDays.length - strengthCount;

  function handleLongRunDayChange(day: string) {
    dispatch({ type: "SET_FIELD", field: "longRunDay", value: day });
    if (!state.trainingDays.includes(day)) {
      dispatch({ type: "TOGGLE_TRAINING_DAY", day });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (state.trainingDays.length < 2) {
      dispatch({ type: "SET_ERROR", value: "Sélectionne au moins 2 jours d'entraînement" });
      return;
    }

    dispatch({ type: "SET_LOADING", value: true });

    try {
      const result = await generateTrainingPlan({
        raceType: state.raceType,
        raceDate: state.raceDate || undefined,
        startDate: state.startDate || undefined,
        targetDistance: state.targetDistance ? Number(state.targetDistance) : undefined,
        targetElevation: state.targetElevation ? Number(state.targetElevation) : undefined,
        targetTime: state.targetTime || undefined,
        trainingDays: state.trainingDays,
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
      {/* ── Section 1 : Objectif ── */}
      <Card>
        <SectionTitle number={1} title="Ton objectif" />

        {/* Race type cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {raceTypes.map((t) => {
            const selected = state.raceType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => dispatch({ type: "SET_RACE_TYPE", value: t.value })}
                className={`group flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                    : "border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <span className={`text-sm font-semibold ${selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                  {t.label}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{t.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Trail-specific */}
        {state.raceType === "trail" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
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

        {/* Chrono (masqué pour trail — estimé par l'IA) */}
        {state.raceType !== "trail" && (
          <div className="mt-4">
            <FormField label="Objectif chrono" htmlFor="target-time" labelSuffix="(optionnel)">
              <Input
                id="target-time"
                type="text"
                value={state.targetTime}
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "targetTime", value: e.target.value })}
                placeholder="ex: 1h45"
              />
            </FormField>
          </div>
        )}
      </Card>

      {/* ── Section 2 : Dates ── */}
      <Card>
        <SectionTitle number={2} title="Calendrier" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Date de la course" htmlFor="race-date" labelSuffix="(optionnel)">
            <Input
              id="race-date"
              type="date"
              value={state.raceDate}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "raceDate", value: e.target.value })}
            />
          </FormField>
          <FormField label="Début de la préparation" htmlFor="start-date" labelSuffix="(optionnel)">
            <Input
              id="start-date"
              type="date"
              value={state.startDate}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "startDate", value: e.target.value })}
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Les semaines passées seront marquées complétées.
            </p>
          </FormField>
        </div>
      </Card>

      {/* ── Section 3 : Jours d'entraînement ── */}
      <Card>
        <SectionTitle number={3} title="Tes jours de course" />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sélectionne les jours où tu veux courir. La sortie longue sera
          automatiquement placée le jour choisi.
        </p>

        {/* Day picker */}
        <div className="mt-4 grid grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const isSelected = state.trainingDays.includes(d.value);
            const isLongRun = d.value === state.longRunDay;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => dispatch({ type: "TOGGLE_TRAINING_DAY", day: d.value })}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {d.label}
                {isLongRun && isSelected && (
                  <span className="mt-0.5 text-[10px] font-medium leading-none opacity-60">SL</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Recap */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--accent)]">{state.trainingDays.length}</span> jour{state.trainingDays.length > 1 ? "s" : ""} de course
            {state.includeStrength && state.strengthFrequency > 0 && (
              <span className="text-[var(--text-muted)]"> + {state.strengthFrequency} renfo</span>
            )}
            {restDays > 0 && (
              <span className="text-[var(--text-muted)]"> + {restDays} repos</span>
            )}
          </span>

          {/* Long run day */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">Sortie longue :</span>
            <select
              value={state.longRunDay}
              onChange={(e) => handleLongRunDayChange(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-sm capitalize text-[var(--text-primary)]"
            >
              {weekDays.map((d) => (
                <option key={d.value} value={d.value}>{d.value}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── Section 4 : Options ── */}
      <Card>
        <SectionTitle number={4} title="Options" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Planning mode */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Planifier les séances par</p>
            <div className="flex gap-2">
              <ToggleOption
                selected={state.planningMode === "time"}
                onClick={() => dispatch({ type: "SET_FIELD", field: "planningMode", value: "time" })}
                icon={<Timer className="h-4 w-4" />}
                label="Temps"
              />
              <ToggleOption
                selected={state.planningMode === "distance"}
                onClick={() => dispatch({ type: "SET_FIELD", field: "planningMode", value: "distance" })}
                icon={<Ruler className="h-4 w-4" />}
                label="Distance"
              />
            </div>
          </div>

          {/* Strength */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Renforcement musculaire</p>
            <div className="flex items-center gap-2">
              <ToggleOption
                selected={state.includeStrength}
                onClick={() => dispatch({ type: "SET_FIELD", field: "includeStrength", value: !state.includeStrength })}
                icon={<Dumbbell className="h-4 w-4" />}
                label={state.includeStrength ? "Activé" : "Ajouter"}
              />
              {state.includeStrength && freeDays.length > 0 && (
                <div className="flex gap-1.5">
                  {Array.from({ length: freeDays.length }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => dispatch({ type: "SET_FIELD", field: "strengthFrequency", value: n })}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all ${
                        state.strengthFrequency === n
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="self-center text-xs text-[var(--text-muted)]">/ sem.</span>
                </div>
              )}
            </div>
            {state.includeStrength && freeDays.length === 0 && (
              <p className="mt-1.5 text-xs text-orange-500">
                Aucun jour libre — libère un jour pour ajouter du renforcement.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Error */}
      {state.error && (
        <AlertBanner variant="error">{state.error}</AlertBanner>
      )}

      {/* Submit */}
      <Button type="submit" fullWidth size="lg" loading={state.loading}>
        <Sparkles className="h-5 w-5" />
        {state.loading ? "Génération en cours..." : "Générer mon plan"}
      </Button>

      {state.loading && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 text-center">
          <p className="text-sm font-medium text-[var(--accent)]">
            Le modèle IA génère ton plan personnalisé...
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Cela peut prendre jusqu&apos;à 1-2 minutes. Merci de patienter.
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
            {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
          </p>
        </div>
      )}
    </form>
  );
}

/* ── Sub-components ── */

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
        {number}
      </span>
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
    </div>
  );
}

function ToggleOption({
  selected,
  onClick,
  icon,
  label,
  fullWidth,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
        fullWidth ? "w-full" : ""
      } ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
