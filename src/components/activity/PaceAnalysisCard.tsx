import { formatPace } from "@/lib/format";
import Card from "@/components/shared/Card";
import { TrendingDown, TrendingUp, Minus, Target, Zap, Timer } from "lucide-react";
import PaceChart from "./PaceChart";

interface Split {
  splitNumber: number;
  averageSpeed: number | null;
  distance: number;
}

interface Props {
  activity: {
    averageSpeed: number | null;
    maxSpeed: number | null;
    paceVariability: number | null;
    negativeSplitRatio: number | null;
    fastestSplitKm: number | null;
    slowestSplitKm: number | null;
    paceDecay: number | null;
    evenPaceScore: number | null;
    distance: number;
    splits: Split[];
  };
}

export default function PaceAnalysisCard({ activity }: Props) {
  const {
    averageSpeed,
    maxSpeed,
    paceVariability,
    negativeSplitRatio,
    fastestSplitKm,
    slowestSplitKm,
    paceDecay,
    evenPaceScore,
    distance,
    splits,
  } = activity;

  // Si pas de données d'allure et pas de splits, ne pas afficher
  const hasStats = evenPaceScore != null || negativeSplitRatio != null;
  const hasSplits = splits.length >= 2;
  if (!hasStats && !hasSplits) {
    return null;
  }

  const totalKm = Math.floor(distance / 1000);

  // Déterminer la stratégie de course
  // negativeSplitRatio = vitesse 2ème moitié / vitesse 1ère moitié
  // ratio > 1 = 2ème moitié plus rapide (negative split)
  // ratio < 1 = 2ème moitié plus lente (positive split)
  const getStrategyInfo = () => {
    if (negativeSplitRatio == null) return null;
    if (negativeSplitRatio > 1.03) {
      return {
        label: "Negative Split",
        description: "2ème moitié plus rapide",
        icon: TrendingUp,
        color: "text-green-600",
        bgColor: "bg-green-50",
      };
    }
    if (negativeSplitRatio < 0.97) {
      return {
        label: "Positive Split",
        description: "2ème moitié plus lente",
        icon: TrendingDown,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
      };
    }
    return {
      label: "Even Split",
      description: "Allure constante",
      icon: Minus,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  };

  const strategy = getStrategyInfo();

  // Score de régularité avec couleur
  const getScoreColor = (score: number | null) => {
    if (score == null) return "text-[var(--text-secondary)]";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card>
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] md:text-lg">
        <Timer className="h-5 w-5 text-[var(--accent-primary)]" />
        Analyse de l&apos;allure
      </h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Allure moyenne */}
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Allure moy.
          </div>
          <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">
            {averageSpeed ? formatPace(averageSpeed) : "—"}
          </div>
        </div>

        {/* Allure max */}
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Allure max
          </div>
          <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">
            {maxSpeed ? formatPace(maxSpeed) : "—"}
          </div>
        </div>

        {/* Score de régularité */}
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            <Target className="h-3.5 w-3.5" />
            Régularité
          </div>
          <div className={`mt-1 text-xl font-bold ${getScoreColor(evenPaceScore)}`}>
            {evenPaceScore != null ? `${evenPaceScore}/100` : "—"}
          </div>
        </div>

        {/* Variabilité */}
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Variabilité
          </div>
          <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">
            {paceVariability != null ? `±${paceVariability.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Stratégie de course */}
      {strategy && (
        <div className={`mt-4 flex items-center gap-3 rounded-lg ${strategy.bgColor} p-3`}>
          <strategy.icon className={`h-5 w-5 ${strategy.color}`} />
          <div>
            <div className={`font-semibold ${strategy.color}`}>{strategy.label}</div>
            <div className="text-sm text-[var(--text-secondary)]">
              {strategy.description}
              {negativeSplitRatio != null && (
                <span className="ml-1 text-[var(--text-tertiary)]">
                  (ratio: {negativeSplitRatio.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Détails supplémentaires */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        {/* Km le plus rapide */}
        {fastestSplitKm != null && (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-[var(--text-secondary)]">
              Plus rapide: <span className="font-medium text-green-600">Km {fastestSplitKm}</span>
              {totalKm > 2 && (
                <span className="text-[var(--text-muted)]">
                  {" "}
                  ({Math.round((fastestSplitKm / totalKm) * 100)}%)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Km le plus lent */}
        {slowestSplitKm != null && (
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            <span className="text-[var(--text-secondary)]">
              Plus lent: <span className="font-medium text-amber-600">Km {slowestSplitKm}</span>
              {totalKm > 2 && (
                <span className="text-[var(--text-muted)]">
                  {" "}
                  ({Math.round((slowestSplitKm / totalKm) * 100)}%)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Évolution de l'allure */}
        {paceDecay != null && (
          <div className="flex items-center gap-2">
            {paceDecay > 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
            <span className="text-[var(--text-secondary)]">
              {paceDecay > 0 ? "Ralentissement" : "Accélération"}:{" "}
              <span className={paceDecay > 0 ? "font-medium text-red-600" : "font-medium text-green-600"}>
                {Math.abs(paceDecay).toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Graphique d'allure par km */}
      {splits.length >= 2 && (
        <PaceChart
          splits={splits}
          fastestSplitKm={fastestSplitKm}
          slowestSplitKm={slowestSplitKm}
          averageSpeed={averageSpeed}
        />
      )}
    </Card>
  );
}
