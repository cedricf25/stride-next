import Link from "next/link";
import { Calendar, Clock, ArrowRight, Footprints, Target } from "lucide-react";
import { Card, Badge } from "@/components/shared";

type NextSessionData = {
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
    workoutSummary: string | null;
  };
  plan: {
    id: string;
    name: string;
    raceType: string;
    planningMode: string;
  };
  weekNumber: number;
  sessionDate: Date;
};

interface Props {
  data: NextSessionData | null;
}

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  recovery: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
  tempo: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  interval: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  long_run: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const typeLabels: Record<string, string> = {
  easy: "Endurance fondamentale",
  recovery: "Récupération",
  tempo: "Tempo",
  interval: "Fractionné",
  long_run: "Sortie longue",
};

function formatSessionDate(date: Date): { label: string; isToday: boolean; isTomorrow: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return { label: "Aujourd'hui", isToday: true, isTomorrow: false };
  }
  if (dateOnly.getTime() === tomorrow.getTime()) {
    return { label: "Demain", isToday: false, isTomorrow: true };
  }

  return {
    label: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    isToday: false,
    isTomorrow: false,
  };
}

export default function NextSessionCard({ data }: Props) {
  if (!data) return null;

  const { session, plan, weekNumber, sessionDate } = data;
  const colors = typeColors[session.sessionType] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
  const dateInfo = formatSessionDate(sessionDate);

  return (
    <Card padding="none" className={`overflow-hidden border ${colors.border}`}>
      <div className={`${colors.bg} px-5 py-4`}>
        {/* Header avec date et lien plan */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className={`h-4 w-4 ${colors.text}`} />
            <span className={`text-sm font-semibold ${colors.text}`}>
              {dateInfo.label}
            </span>
            {dateInfo.isToday && (
              <Badge color="green" variant="solid" size="sm">
                À faire
              </Badge>
            )}
            {dateInfo.isTomorrow && (
              <Badge color="blue" variant="outline" size="sm">
                À venir
              </Badge>
            )}
          </div>
          <Link
            href={`/training/${plan.id}`}
            className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <span>{plan.name}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Titre et type */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
              {typeLabels[session.sessionType] ?? session.sessionType}
            </span>
            {session.workoutSummary && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                {session.workoutSummary}
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              Semaine {weekNumber}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {session.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {session.description}
          </p>
        </div>

        {/* Métriques */}
        <div className="mt-4 flex flex-wrap gap-4">
          {session.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {session.duration} min
              </span>
            </div>
          )}
          {session.distance && (
            <div className="flex items-center gap-1.5">
              <Footprints className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {session.distance} km
              </span>
            </div>
          )}
          {session.targetPace && (
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {session.targetPace}
              </span>
            </div>
          )}
          {session.targetHRZone && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-[var(--text-secondary)]">
                {session.targetHRZone}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
