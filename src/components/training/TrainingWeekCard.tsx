"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TrainingSessionCard from "./TrainingSessionCard";
import Card from "@/components/shared/Card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { reorderSessions } from "@/actions/training";

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
  sortOrder: number;
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
  exercises: string | null;
  completed: boolean;
  missed: boolean;
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

const dayOrder: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
};

function SortableSession({
  session,
  planningMode,
}: {
  session: Session;
  planningMode: "time" | "distance";
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <button
        {...attributes}
        {...listeners}
        className="mt-3 flex-shrink-0 cursor-grab touch-none rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] active:cursor-grabbing"
        aria-label="Réordonner la séance"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TrainingSessionCard session={session} planningMode={planningMode} />
      </div>
    </div>
  );
}

export default function TrainingWeekCard({ week, planId, planStartDate, planningMode }: Props) {
  const dndId = useId();
  const [open, setOpen] = useLocalStorage(`week-open-${planId}-${week.weekNumber}`, true);

  // Tri initial : par sortOrder d'abord, puis par dayOfWeek en fallback
  const initialSorted = [...week.sessions].sort((a, b) => {
    // Si tous les sortOrder sont 0 (plans existants), fallback sur dayOfWeek
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return (dayOrder[a.dayOfWeek] ?? 7) - (dayOrder[b.dayOfWeek] ?? 7);
  });

  const [sessions, setSessions] = useState(initialSorted);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const nonRest = week.sessions.filter((s) => s.sessionType !== "rest");
  const completed = nonRest.filter((s) => s.completed && !s.missed).length;
  const missed = nonRest.filter((s) => s.missed).length;
  const total = nonRest.length;

  // Jours utilisés dans cette semaine, triés par ordre original
  const usedDays = [...week.sessions]
    .sort((a, b) => (dayOrder[a.dayOfWeek] ?? 7) - (dayOrder[b.dayOfWeek] ?? 7))
    .map((s) => s.dayOfWeek);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sessions.findIndex((s) => s.id === active.id);
    const newIndex = sessions.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sessions, oldIndex, newIndex);

    // Réassigner les jours : chaque position prend le jour correspondant
    const withNewDays = reordered.map((s, i) => ({
      ...s,
      dayOfWeek: usedDays[i],
    }));
    setSessions(withNewDays);

    const dayMapping: Record<string, string> = {};
    withNewDays.forEach((s, i) => { dayMapping[s.id] = usedDays[i]; });
    await reorderSessions(withNewDays.map((s) => s.id), dayMapping);
  }

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
            {missed > 0 && <span className="ml-1 text-red-500">({missed} loupé{missed > 1 ? "s" : ""})</span>}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border-subtle)] px-6 py-4">
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sessions.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sessions.map((session) => (
                  <SortableSession
                    key={session.id}
                    session={session}
                    planningMode={planningMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </Card>
  );
}
