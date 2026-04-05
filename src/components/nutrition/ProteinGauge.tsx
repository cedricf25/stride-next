import { Beef } from "lucide-react";
import type { ProteinTarget } from "@/types/nutrition";

interface ProteinGaugeProps {
  consumed: number;
  target: ProteinTarget;
}

export default function ProteinGauge({ consumed, target }: ProteinGaugeProps) {
  const { min, optimal, max } = target;

  // Échelle : de 0 à max * 1.3 pour laisser de la marge visuelle à droite
  const scaleMax = Math.round(max * 1.3);
  const toPercent = (v: number) =>
    Math.min(100, Math.max(0, (v / scaleMax) * 100));

  const minPct = toPercent(min);
  const optimalPct = toPercent(optimal);
  const maxPct = toPercent(max);
  const cursorPct = toPercent(consumed);

  // Déterminer la zone et le label
  let zone: "danger" | "warning" | "good" | "excess";
  let zoneLabel: string;

  if (consumed < min) {
    zone = "danger";
    zoneLabel = `${min - consumed}g manquants — risque de fonte musculaire`;
  } else if (consumed < optimal) {
    zone = "warning";
    zoneLabel = `Encore ${optimal - consumed}g pour atteindre l'optimal`;
  } else if (consumed <= max) {
    zone = "good";
    zoneLabel = "Apport optimal";
  } else {
    zone = "excess";
    zoneLabel = `${consumed - max}g au-dessus du plafond`;
  }

  const zoneColors = {
    danger: "text-red-600 dark:text-red-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    good: "text-green-600 dark:text-green-400",
    excess: "text-orange-600 dark:text-orange-400",
  };

  const cursorColors = {
    danger: "bg-red-600",
    warning: "bg-yellow-500",
    good: "bg-green-500",
    excess: "bg-orange-500",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Beef className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-sm text-[var(--text-primary)]">
            Protéines
          </span>
          {target.isTrainingDay && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Jour sport
            </span>
          )}
        </div>
        <span className={`text-sm font-bold ${zoneColors[zone]}`}>
          {consumed}g
        </span>
      </div>

      {/* Réglette */}
      <div className="relative h-3 rounded-full overflow-hidden bg-[var(--bg-secondary)]">
        {/* Zone rouge (0 → min) */}
        <div
          className="absolute inset-y-0 left-0 bg-red-400/60 dark:bg-red-500/40"
          style={{ width: `${minPct}%` }}
        />
        {/* Zone jaune (min → optimal) */}
        <div
          className="absolute inset-y-0 bg-yellow-400/60 dark:bg-yellow-500/40"
          style={{ left: `${minPct}%`, width: `${optimalPct - minPct}%` }}
        />
        {/* Zone verte (optimal → max) */}
        <div
          className="absolute inset-y-0 bg-green-400/60 dark:bg-green-500/40"
          style={{ left: `${optimalPct}%`, width: `${maxPct - optimalPct}%` }}
        />
        {/* Zone orange (max → fin) */}
        <div
          className="absolute inset-y-0 bg-orange-300/40 dark:bg-orange-500/30"
          style={{ left: `${maxPct}%`, width: `${100 - maxPct}%` }}
        />

        {/* Curseur position actuelle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-md ${cursorColors[zone]}`}
          style={{ left: `${cursorPct}%` }}
        />
      </div>

      {/* Légende sous la réglette */}
      <div className="relative mt-1 h-4 text-[10px] text-[var(--text-muted)]">
        <span className="absolute" style={{ left: `${minPct}%`, transform: "translateX(-50%)" }}>
          {min}g
        </span>
        <span className="absolute" style={{ left: `${optimalPct}%`, transform: "translateX(-50%)" }}>
          {optimal}g
        </span>
        <span className="absolute" style={{ left: `${maxPct}%`, transform: "translateX(-50%)" }}>
          {max}g
        </span>
      </div>

      {/* Message contextuel */}
      <p className={`text-xs mt-1 ${zoneColors[zone]}`}>{zoneLabel}</p>

      {/* Ratio g/kg */}
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
        Cible : {target.ratioPerKg.min}–{target.ratioPerKg.max} g/kg
        {target.isTrainingDay ? " (jour entraînement)" : " (jour repos)"}
      </p>
    </div>
  );
}
