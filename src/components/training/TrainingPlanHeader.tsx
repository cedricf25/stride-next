import { Target, Calendar, CalendarCheck, Clock } from "lucide-react";
import GoalProbabilityBadge from "./GoalProbabilityBadge";
import { ProgressBar, Badge } from "@/components/shared";

interface Props {
  plan: {
    name: string;
    raceType: string;
    raceDate: Date | null;
    startDate: Date | null;
    targetTime: string | null;
    daysPerWeek: number;
    longRunDay: string;
    status: string;
    goalProbability: number | null;
    goalAssessment: string | null;
    weeks: { sessions: { completed: boolean }[] }[];
  };
}

export default function TrainingPlanHeader({ plan }: Props) {
  const totalSessions = plan.weeks.reduce(
    (sum, w) => sum + w.sessions.length,
    0
  );
  const completedSessions = plan.weeks.reduce(
    (sum, w) => sum + w.sessions.filter((s) => s.completed).length,
    0
  );
  const progress =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <div>
      <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
        <Target className="h-7 w-7 text-blue-600" />
        {plan.name}
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <Badge color="blue" size="md" className="capitalize">
          {plan.raceType}
        </Badge>
        {plan.startDate && (
          <span className="flex items-center gap-1">
            <CalendarCheck className="h-4 w-4" />
            Début : {new Date(plan.startDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        {plan.raceDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Course : {new Date(plan.raceDate).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        {plan.targetTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Objectif : {plan.targetTime}
          </span>
        )}
        <span>{plan.daysPerWeek} jours/semaine</span>
        <span className="capitalize">Sortie longue : {plan.longRunDay}</span>
      </div>

      {plan.goalProbability != null && (
        <div className="mt-4">
          <GoalProbabilityBadge
            probability={plan.goalProbability}
            assessment={plan.goalAssessment}
          />
        </div>
      )}

      {/* Progress */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <ProgressBar value={progress} color="bg-blue-500" height="md" />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {completedSessions}/{totalSessions} séances ({progress}%)
        </span>
      </div>
    </div>
  );
}
