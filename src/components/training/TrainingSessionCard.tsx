"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreVertical, Clock, Ruler, Upload, Loader2 } from "lucide-react";
import { toggleSessionCompleted, updateSessionDisplayMode } from "@/actions/training";
import { exportSessionToGarmin } from "@/actions/garmin-export";

interface LinkedActivity {
  id: string;
  activityName: string;
  distance: number;
  duration: number;
  averageSpeed: number | null;
  averageHR: number | null;
  startTimeLocal: Date;
}

interface Props {
  session: {
    id: string;
    dayOfWeek: string;
    sessionType: string;
    title: string;
    description: string;
    distance: number | null;
    duration: number | null;
    targetPace: string | null;
    targetHRZone: string | null;
    intensity: string;
    displayMode: string | null;
    workoutSummary: string | null;
    completed: boolean;
    linkedActivityId: string | null;
    linkedActivity: LinkedActivity | null;
    matchScore: number | null;
  };
  planningMode: "time" | "distance";
}

const typeColors: Record<string, string> = {
  easy: "border-l-green-500 bg-green-50",
  recovery: "border-l-green-300 bg-green-50",
  tempo: "border-l-orange-500 bg-orange-50",
  interval: "border-l-red-500 bg-red-50",
  long_run: "border-l-blue-500 bg-blue-50",
  rest: "border-l-[var(--border-default)] bg-[var(--bg-surface-hover)]",
};

const typeLabels: Record<string, string> = {
  easy: "Facile",
  recovery: "Récupération",
  tempo: "Tempo",
  interval: "Fractionné",
  long_run: "Sortie longue",
  rest: "Repos",
};

// Labels courts pour affichage compact (badge)
const typeShortLabels: Record<string, string> = {
  easy: "EF",
  recovery: "Récup",
  tempo: "Tempo",
  interval: "VMA",
  long_run: "SL",
  rest: "Repos",
};

// Couleurs des badges par type de séance
const typeBadgeColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  recovery: "bg-green-50 text-green-600",
  tempo: "bg-orange-100 text-orange-700",
  interval: "bg-red-100 text-red-700",
  long_run: "bg-blue-100 text-blue-700",
  rest: "bg-gray-100 text-gray-500",
};

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatDuration(seconds: number): number {
  return Math.round(seconds / 60);
}

function formatPace(speedMs: number): string {
  if (!speedMs || speedMs <= 0) return "-";
  const paceSecPerKm = 1000 / speedMs;
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getVariationClass(planned: number, actual: number, tolerance: number = 0.1): string {
  const ratio = actual / planned;
  if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) return "text-green-600";
  if (ratio > 1 + tolerance) return "text-orange-500";
  return "text-red-500";
}

function getVariationIcon(planned: number, actual: number, tolerance: number = 0.1): string {
  const ratio = actual / planned;
  if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) return "✓";
  if (ratio > 1 + tolerance) return "↑";
  return "↓";
}

export default function TrainingSessionCard({ session, planningMode }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const colorClass = typeColors[session.sessionType] ?? "border-l-[var(--border-default)] bg-[var(--bg-surface-hover)]";
  const activity = session.linkedActivity;

  // Mode effectif : displayMode de la séance ou planningMode du plan
  const effectiveMode = (session.displayMode as "time" | "distance" | null) ?? planningMode;

  // Fermer le menu au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  async function handleToggle() {
    await toggleSessionCompleted(session.id);
    router.refresh();
  }

  async function handleDisplayModeChange(mode: "time" | "distance") {
    // Si le mode choisi est le même que le planningMode du plan, on remet à null (utilise le défaut)
    const newMode = mode === planningMode ? null : mode;
    await updateSessionDisplayMode(session.id, newMode);
    setMenuOpen(false);
    router.refresh();
  }

  async function handleExportToGarmin() {
    setExporting(true);
    try {
      const result = await exportSessionToGarmin(session.id);
      if (result.success) {
        alert("Séance exportée vers Garmin Connect !");
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } catch {
      alert("Erreur lors de l'export");
    } finally {
      setExporting(false);
      setMenuOpen(false);
    }
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 ${colorClass} ${
        session.completed ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={handleToggle}
        className={`-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
          session.completed ? "" : "hover:bg-[var(--bg-surface)]"
        }`}
        aria-label={session.completed ? "Marquer comme non complété" : "Marquer comme complété"}
      >
        <span className={`flex h-5 w-5 items-center justify-center rounded border ${
          session.completed
            ? "border-green-500 bg-green-500 text-white"
            : "border-[var(--border-default)] bg-[var(--bg-surface)]"
        }`}>
          {session.completed && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium capitalize text-[var(--text-tertiary)]">
            {session.dayOfWeek}
          </span>
          <span className="text-xs text-[var(--text-muted)]">|</span>
          {/* Badge type court */}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              typeBadgeColors[session.sessionType] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {typeShortLabels[session.sessionType] ?? session.sessionType}
          </span>
          {/* Badge workoutSummary si présent (ex: "3×10' Z4") */}
          {session.workoutSummary && (
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              {session.workoutSummary}
            </span>
          )}
          {session.matchScore !== null && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                session.matchScore >= 80
                  ? "bg-green-100 text-green-700"
                  : session.matchScore >= 60
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-orange-100 text-orange-700"
              }`}
            >
              {session.matchScore}%
            </span>
          )}
        </div>
        <p className={`text-sm font-medium ${session.completed ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"}`}>
          {session.title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{session.description}</p>

        {/* Comparatif planifié vs réalisé */}
        {activity ? (
          <div className="mt-2 rounded-md bg-[var(--bg-surface)] p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Comparatif
              </span>
              <Link
                href={`/activity/${activity.id}`}
                className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
              >
                {activity.activityName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* Distance */}
              <div>
                <div className="text-[var(--text-muted)]">Distance</div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">
                    {session.distance ? `${session.distance}` : "-"}
                  </span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span
                    className={
                      session.distance
                        ? getVariationClass(session.distance, activity.distance / 1000)
                        : "text-[var(--text-primary)]"
                    }
                  >
                    {formatDistance(activity.distance)} km
                    {session.distance && (
                      <span className="ml-0.5 text-[10px]">
                        {getVariationIcon(session.distance, activity.distance / 1000)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {/* Durée */}
              <div>
                <div className="text-[var(--text-muted)]">Durée</div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">
                    {session.duration ? `${session.duration}'` : "-"}
                  </span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span
                    className={
                      session.duration
                        ? getVariationClass(session.duration, formatDuration(activity.duration))
                        : "text-[var(--text-primary)]"
                    }
                  >
                    {formatDuration(activity.duration)}'
                    {session.duration && (
                      <span className="ml-0.5 text-[10px]">
                        {getVariationIcon(session.duration, formatDuration(activity.duration))}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {/* Allure */}
              <div>
                <div className="text-[var(--text-muted)]">Allure</div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">
                    {session.targetPace ?? "-"}
                  </span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="text-[var(--text-primary)]">
                    {activity.averageSpeed ? formatPace(activity.averageSpeed) : "-"}/km
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {/* Affiche la métrique principale en premier selon le mode */}
            {effectiveMode === "time" ? (
              <>
                {session.duration && (
                  <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                    {session.duration} min
                  </span>
                )}
                {session.distance && (
                  <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                    ~{session.distance} km
                  </span>
                )}
              </>
            ) : (
              <>
                {session.distance && (
                  <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                    {session.distance} km
                  </span>
                )}
                {session.duration && (
                  <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                    ~{session.duration} min
                  </span>
                )}
              </>
            )}
            {session.targetPace && (
              <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                {session.targetPace}
              </span>
            )}
            {session.targetHRZone && (
              <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                {session.targetHRZone}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Menu 3 points pour changer le mode d'affichage */}
      {session.sessionType !== "rest" && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)]"
            aria-label="Options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              {/* Backdrop pour fermer sur mobile */}
              <div
                className="fixed inset-0 z-10 md:hidden"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 shadow-lg">
                <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Afficher par
                </div>
                <button
                  onClick={() => handleDisplayModeChange("time")}
                  className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-[var(--bg-surface-hover)] min-h-[44px] ${
                    effectiveMode === "time" ? "text-blue-500" : "text-[var(--text-secondary)]"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  Temps
                  {effectiveMode === "time" && <span className="ml-auto text-xs">✓</span>}
                </button>
                <button
                  onClick={() => handleDisplayModeChange("distance")}
                  className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-[var(--bg-surface-hover)] min-h-[44px] ${
                    effectiveMode === "distance" ? "text-blue-500" : "text-[var(--text-secondary)]"
                  }`}
                >
                  <Ruler className="h-4 w-4" />
                  Distance
                  {effectiveMode === "distance" && <span className="ml-auto text-xs">✓</span>}
                </button>
                <div className="my-1 border-t border-[var(--border-default)]" />
                <button
                  onClick={handleExportToGarmin}
                  disabled={exporting}
                  className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] min-h-[44px] disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Exporter vers Garmin
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
