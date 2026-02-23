"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { toggleSessionCompleted } from "@/actions/training";

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
    completed: boolean;
    linkedActivityId: string | null;
    linkedActivity: LinkedActivity | null;
    matchScore: number | null;
  };
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

export default function TrainingSessionCard({ session }: Props) {
  const router = useRouter();
  const colorClass = typeColors[session.sessionType] ?? "border-l-[var(--border-default)] bg-[var(--bg-surface-hover)]";
  const activity = session.linkedActivity;

  async function handleToggle() {
    await toggleSessionCompleted(session.id);
    router.refresh();
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 ${colorClass} ${
        session.completed ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={handleToggle}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          session.completed
            ? "border-green-500 bg-green-500 text-white"
            : "border-[var(--border-default)] bg-[var(--bg-surface)]"
        }`}
      >
        {session.completed && (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium capitalize text-[var(--text-tertiary)]">
            {session.dayOfWeek}
          </span>
          <span className="text-xs text-[var(--text-muted)]">|</span>
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {typeLabels[session.sessionType] ?? session.sessionType}
          </span>
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
            {session.distance && (
              <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                {session.distance} km
              </span>
            )}
            {session.duration && (
              <span className="rounded bg-[var(--bg-surface)]/80 px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                {session.duration} min
              </span>
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
    </div>
  );
}
