"use client";

import { useRouter } from "next/navigation";
import { toggleSessionCompleted } from "@/actions/training";

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
  };
}

const typeColors: Record<string, string> = {
  easy: "border-l-green-500 bg-green-50",
  recovery: "border-l-green-300 bg-green-50",
  tempo: "border-l-orange-500 bg-orange-50",
  interval: "border-l-red-500 bg-red-50",
  long_run: "border-l-blue-500 bg-blue-50",
  rest: "border-l-gray-300 bg-gray-50",
};

const typeLabels: Record<string, string> = {
  easy: "Facile",
  recovery: "Récupération",
  tempo: "Tempo",
  interval: "Fractionné",
  long_run: "Sortie longue",
  rest: "Repos",
};

export default function TrainingSessionCard({ session }: Props) {
  const router = useRouter();
  const colorClass = typeColors[session.sessionType] ?? "border-l-gray-300 bg-gray-50";

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
            : "border-gray-300 bg-white"
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
          <span className="text-xs font-medium capitalize text-gray-500">
            {session.dayOfWeek}
          </span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs font-medium text-gray-600">
            {typeLabels[session.sessionType] ?? session.sessionType}
          </span>
        </div>
        <p className={`text-sm font-medium ${session.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
          {session.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">{session.description}</p>

        <div className="mt-1.5 flex flex-wrap gap-2">
          {session.distance && (
            <span className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-gray-600">
              {session.distance} km
            </span>
          )}
          {session.duration && (
            <span className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-gray-600">
              {session.duration} min
            </span>
          )}
          {session.targetPace && (
            <span className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-gray-600">
              {session.targetPace}
            </span>
          )}
          {session.targetHRZone && (
            <span className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-gray-600">
              {session.targetHRZone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
