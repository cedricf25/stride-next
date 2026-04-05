"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import TrainingSessionCard from "./TrainingSessionCard";
import Card from "@/components/shared/Card";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface LinkedActivity {
  id: string;
  activityName: string;
  distance: number;
  duration: number;
  averageSpeed: number | null;
  averageHR: number | null;
  startTimeLocal: Date;
}

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
  displayMode: string | null;
  workoutSummary: string | null;
  elevationGain: number | null;
  terrainType: string | null;
  completed: boolean;
  linkedActivityId: string | null;
  linkedActivity: LinkedActivity | null;
  matchScore: number | null;
}

interface Props {
  week: {
    id: string;
    weekNumber: number;
    theme: string;
    totalVolume: number | null;
    sessions: Session[];
  };
  planId: string;
  planStartDate?: Date | null;
  planningMode: "time" | "distance";
}

function formatWeekDates(planStartDate: Date, weekNumber: number): string {
  const start = new Date(planStartDate);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return `${fmtDay(start)} – ${fmtDay(end)}`;
}

export default function TrainingWeekCard({ week, planId, planStartDate, planningMode }: Props) {
  // Use planId + weekNumber as key for stable state across updates
  const [open, setOpen] = useLocalStorage(`week-open-${planId}-${week.weekNumber}`, true);

  const completed = week.sessions.filter((s) => s.completed).length;
  const total = week.sessions.length;

  return (
    <Card padding="none">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
          )}
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Semaine {week.weekNumber}
            </span>
            {planStartDate && (
              <span className="ml-2 text-sm text-[var(--text-muted)]">
                {formatWeekDates(planStartDate, week.weekNumber)}
              </span>
            )}
            <span className="ml-2 text-sm text-[var(--text-tertiary)]">{week.theme}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
          {week.totalVolume != null && (
            <span>{week.totalVolume} km</span>
          )}
          <span>
            {completed}/{total} séances
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border-subtle)] px-6 py-4">
          <div className="space-y-3">
            {week.sessions.map((session) => (
              <TrainingSessionCard key={session.id} session={session} planningMode={planningMode} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
