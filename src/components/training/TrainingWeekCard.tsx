"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import TrainingSessionCard from "./TrainingSessionCard";

interface Session {
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
}

interface Props {
  week: {
    id: string;
    weekNumber: number;
    theme: string;
    totalVolume: number | null;
    sessions: Session[];
  };
}

export default function TrainingWeekCard({ week }: Props) {
  const [open, setOpen] = useState(true);
  const completed = week.sessions.filter((s) => s.completed).length;
  const total = week.sessions.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <span className="font-semibold text-gray-900">
              Semaine {week.weekNumber}
            </span>
            <span className="ml-2 text-sm text-gray-500">{week.theme}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {week.totalVolume != null && (
            <span>{week.totalVolume} km</span>
          )}
          <span>
            {completed}/{total} séances
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="space-y-3">
            {week.sessions.map((session) => (
              <TrainingSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
