import { formatPace, formatDuration } from "@/lib/format";
import Card from "@/components/shared/Card";
import { Zap, Flame, Heart, Timer, TrendingUp } from "lucide-react";

interface Interval {
  intervalType: string;
  intervalOrder: number;
  distance: number;
  duration: number;
  noOfSplits: number;
  averageSpeed: number | null;
  averageHR: number | null;
  maxHR: number | null;
  averageCadence: number | null;
}

interface Props {
  intervals: Interval[];
}

const INTERVAL_LABELS: Record<string, { label: string; color: string; bgColor: string; icon: typeof Zap }> = {
  INTERVAL_WARMUP: { label: "Échauffement", color: "text-orange-600", bgColor: "bg-orange-100", icon: Flame },
  INTERVAL_ACTIVE: { label: "Fractions", color: "text-red-600", bgColor: "bg-red-100", icon: Zap },
  INTERVAL_RECOVERY: { label: "Récupération", color: "text-green-600", bgColor: "bg-green-100", icon: Heart },
  INTERVAL_COOLDOWN: { label: "Retour au calme", color: "text-blue-600", bgColor: "bg-blue-100", icon: TrendingUp },
};

export default function IntervalsCard({ intervals }: Props) {
  if (intervals.length === 0) return null;

  // Calculer les totaux
  const totalDistance = intervals.reduce((sum, i) => sum + i.distance, 0);
  const totalDuration = intervals.reduce((sum, i) => sum + i.duration, 0);

  // Trouver les fractions actives pour le résumé
  const activeIntervals = intervals.filter(i => i.intervalType === "INTERVAL_ACTIVE");
  const recoveryIntervals = intervals.filter(i => i.intervalType === "INTERVAL_RECOVERY");

  // Générer le résumé du fractionné (ex: "6×1000m")
  const getSummary = () => {
    if (activeIntervals.length === 0) return null;
    const firstActive = activeIntervals[0];
    const distancePerRep = Math.round(firstActive.distance / firstActive.noOfSplits);
    const reps = firstActive.noOfSplits;

    if (distancePerRep >= 1000) {
      return `${reps}×${(distancePerRep / 1000).toFixed(1).replace(/\.0$/, "")}km`;
    }
    return `${reps}×${distancePerRep}m`;
  };

  const summary = getSummary();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] md:text-lg">
          <Zap className="h-5 w-5 text-red-500" />
          Séance Fractionné
        </h3>
        {summary && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
            {summary}
          </span>
        )}
      </div>

      {/* Résumé global */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-[var(--bg-muted)] p-3 md:grid-cols-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Distance totale
          </div>
          <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
            {(totalDistance / 1000).toFixed(2)} km
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Durée totale
          </div>
          <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
            {formatDuration(totalDuration)}
          </div>
        </div>
        {activeIntervals[0] && (
          <>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Allure fractions
              </div>
              <div className="mt-1 text-lg font-bold text-red-600">
                {activeIntervals[0].averageSpeed ? formatPace(activeIntervals[0].averageSpeed) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                FC moy. fractions
              </div>
              <div className="mt-1 text-lg font-bold text-red-600">
                {activeIntervals[0].averageHR ?? "—"} bpm
              </div>
            </div>
          </>
        )}
      </div>

      {/* Détail des intervalles */}
      <div className="space-y-2">
        {intervals.map((interval) => {
          const config = INTERVAL_LABELS[interval.intervalType] || {
            label: interval.intervalType,
            color: "text-gray-600",
            bgColor: "bg-gray-100",
            icon: Timer,
          };
          const Icon = config.icon;

          return (
            <div
              key={interval.intervalOrder}
              className={`flex items-center gap-3 rounded-lg ${config.bgColor} p-3`}
            >
              <Icon className={`h-5 w-5 ${config.color}`} />
              <div className="flex-1">
                <div className={`font-semibold ${config.color}`}>
                  {config.label}
                  {interval.noOfSplits > 1 && (
                    <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                      ({interval.noOfSplits} répétitions)
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                  <span>{(interval.distance / 1000).toFixed(2)} km</span>
                  <span>{formatDuration(interval.duration)}</span>
                  {interval.averageSpeed && (
                    <span className="font-medium">{formatPace(interval.averageSpeed)}</span>
                  )}
                  {interval.averageHR && (
                    <span>{interval.averageHR} bpm</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparaison fractions vs récup */}
      {activeIntervals.length > 0 && recoveryIntervals.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--border)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Comparaison
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">Différence allure: </span>
              {activeIntervals[0].averageSpeed && recoveryIntervals[0].averageSpeed ? (
                <span className="font-semibold text-[var(--text-primary)]">
                  {((1000 / recoveryIntervals[0].averageSpeed - 1000 / activeIntervals[0].averageSpeed) / 60).toFixed(1)} min/km
                </span>
              ) : (
                "—"
              )}
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Différence FC: </span>
              {activeIntervals[0].averageHR && recoveryIntervals[0].averageHR ? (
                <span className="font-semibold text-[var(--text-primary)]">
                  {activeIntervals[0].averageHR - recoveryIntervals[0].averageHR} bpm
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
