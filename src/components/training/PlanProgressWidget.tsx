import { Card, ProgressBar } from "@/components/shared";

interface Session {
  id: string;
  sessionType: string;
  distance: number | null;
  duration: number | null;
  completed: boolean;
  linkedActivityId: string | null;
  linkedActivity: {
    distance: number;
    duration: number;
  } | null;
  matchScore: number | null;
}

interface Week {
  id: string;
  weekNumber: number;
  totalVolume: number | null;
  sessions: Session[];
}

interface Props {
  weeks: Week[];
}

export default function PlanProgressWidget({ weeks }: Props) {
  // Calculer les statistiques globales
  const allSessions = weeks.flatMap((w) => w.sessions);
  const nonRestSessions = allSessions.filter((s) => s.sessionType !== "rest");

  const completedSessions = nonRestSessions.filter((s) => s.completed && !s.missed);
  const missedSessions = nonRestSessions.filter((s) => s.missed);
  const linkedSessions = nonRestSessions.filter((s) => s.linkedActivityId);

  // Volume planifié vs réalisé
  const plannedDistanceKm = nonRestSessions.reduce((sum, s) => sum + (s.distance ?? 0), 0);
  const actualDistanceKm = linkedSessions.reduce(
    (sum, s) => sum + (s.linkedActivity?.distance ?? 0) / 1000,
    0
  );

  // Durée planifiée vs réalisée
  const plannedDurationMin = nonRestSessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const actualDurationMin = linkedSessions.reduce(
    (sum, s) => sum + (s.linkedActivity?.duration ?? 0) / 60,
    0
  );

  // Score moyen de match
  const matchScores = linkedSessions
    .map((s) => s.matchScore)
    .filter((score): score is number => score !== null);
  const avgMatchScore =
    matchScores.length > 0
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
      : null;

  // Taux de complétion
  const completionRate =
    nonRestSessions.length > 0
      ? Math.round((completedSessions.length / nonRestSessions.length) * 100)
      : 0;

  // Taux de respect du volume
  const volumeRate =
    plannedDistanceKm > 0
      ? Math.round((actualDistanceKm / plannedDistanceKm) * 100)
      : 0;

  return (
    <Card>
      <h3 className="mb-4 font-semibold text-[var(--text-primary)]">
        Progression du plan
      </h3>

      <div className="space-y-4">
        {/* Taux de complétion */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Séances complétées</span>
            <span className="font-medium text-[var(--text-primary)]">
              {completedSessions.length}/{nonRestSessions.length}
              {missedSessions.length > 0 && (
                <span className="ml-1 text-red-500">({missedSessions.length} loupé{missedSessions.length > 1 ? "s" : ""})</span>
              )}
            </span>
          </div>
          <ProgressBar value={completionRate} />
        </div>

        {/* Volume */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Volume (km)</span>
            <span className="font-medium text-[var(--text-primary)]">
              {actualDistanceKm.toFixed(1)} / {plannedDistanceKm.toFixed(1)}
            </span>
          </div>
          <ProgressBar
            value={Math.min(volumeRate, 100)}
            color={volumeRate > 110 ? "bg-orange-500" : volumeRate >= 90 ? "bg-green-500" : "bg-blue-500"}
          />
          {volumeRate > 0 && (
            <div className="mt-0.5 text-right text-xs text-[var(--text-muted)]">
              {volumeRate}% du volume planifié
            </div>
          )}
        </div>

        {/* Durée */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Durée (min)</span>
            <span className="font-medium text-[var(--text-primary)]">
              {Math.round(actualDurationMin)} / {plannedDurationMin}
            </span>
          </div>
          <ProgressBar
            value={plannedDurationMin > 0 ? Math.min((actualDurationMin / plannedDurationMin) * 100, 100) : 0}
          />
        </div>

        {/* Score de match moyen */}
        {avgMatchScore !== null && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--bg-surface-hover)] px-3 py-2">
            <span className="text-sm text-[var(--text-secondary)]">
              Score de conformité moyen
            </span>
            <span
              className={`text-lg font-bold ${
                avgMatchScore >= 80
                  ? "text-green-600"
                  : avgMatchScore >= 60
                    ? "text-yellow-600"
                    : "text-orange-600"
              }`}
            >
              {avgMatchScore}%
            </span>
          </div>
        )}

        {/* Statistiques par type */}
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Par type de séance
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {["easy", "tempo", "interval", "long_run"].map((type) => {
              const sessionsOfType = nonRestSessions.filter((s) => s.sessionType === type);
              const completedOfType = sessionsOfType.filter((s) => s.completed && !s.missed);
              if (sessionsOfType.length === 0) return null;
              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded bg-[var(--bg-surface)] px-2 py-1"
                >
                  <span className="capitalize text-[var(--text-secondary)]">
                    {type === "long_run" ? "Longue" : type === "easy" ? "Facile" : type === "interval" ? "Frac." : "Tempo"}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {completedOfType.length}/{sessionsOfType.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
