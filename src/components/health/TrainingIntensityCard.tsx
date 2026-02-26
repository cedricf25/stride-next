import { Activity, HelpCircle } from "lucide-react";
import Card from "@/components/shared/Card";
import SectionHeader from "@/components/shared/SectionHeader";
import { fetchTrainingIntensity } from "@/actions/health";

interface IntensityBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  optimalMin: number;
  optimalMax: number;
}

function IntensityBar({ label, value, maxValue, color, optimalMin, optimalMax }: IntensityBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const optimalMinPct = (optimalMin / maxValue) * 100;
  const optimalMaxPct = (optimalMax / maxValue) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex w-36 shrink-0 items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <span>{label}</span>
        <HelpCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      </div>
      <span className="w-12 text-right text-sm font-medium text-[var(--text-primary)]">{value}</span>
      <div className="relative h-3 flex-1 rounded-full bg-[var(--bg-muted)]">
        {/* Plage optimale (zone grise avec bordures pointillées) */}
        <div
          className="absolute top-0 h-full rounded-full bg-gray-300/30"
          style={{
            left: `${optimalMinPct}%`,
            width: `${optimalMaxPct - optimalMinPct}%`,
          }}
        >
          <div className="h-full w-full border-x-2 border-dashed border-gray-400" />
        </div>
        {/* Barre de valeur */}
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function TrainingIntensityCard() {
  const data = await fetchTrainingIntensity(28);

  // Plages optimales pour 4 semaines (calibrées sur Garmin)
  // Anaérobie : ~250-500 min/4sem
  // Aérobie élevée : ~800-1600 min/4sem
  // Aérobie faible : ~400-900 min/4sem
  const anaerobicOptimal = { min: 250, max: 500 };
  const aerobicHighOptimal = { min: 800, max: 1600 };
  const aerobicLowOptimal = { min: 400, max: 900 };

  // Échelle basée sur le max entre données et plages optimales
  const maxDataValue = Math.max(
    data.anaerobic, anaerobicOptimal.max,
    data.aerobicHigh, aerobicHighOptimal.max,
    data.aerobicLow, aerobicLowOptimal.max
  );
  const maxValue = maxDataValue * 1.15;

  return (
    <Card>
      <SectionHeader
        icon={<Activity className="h-5 w-5 text-orange-500" />}
        title="Intensité d'entraînement"
        className="mb-2"
      />

      {/* Message d'état */}
      <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
        {data.statusLabel}
      </h3>
      <p className="mb-5 text-sm text-[var(--text-secondary)]">{data.message}</p>

      {/* Barres d'intensité */}
      <div className="space-y-3">
        <IntensityBar
          label="Anaérobique"
          value={data.anaerobic}
          maxValue={maxValue}
          color="bg-blue-500"
          optimalMin={anaerobicOptimal.min}
          optimalMax={anaerobicOptimal.max}
        />
        <IntensityBar
          label="Aérobie élevée"
          value={data.aerobicHigh}
          maxValue={maxValue}
          color="bg-orange-500"
          optimalMin={aerobicHighOptimal.min}
          optimalMax={aerobicHighOptimal.max}
        />
        <IntensityBar
          label="Aérobie faible"
          value={data.aerobicLow}
          maxValue={maxValue}
          color="bg-cyan-500"
          optimalMin={aerobicLowOptimal.min}
          optimalMax={aerobicLowOptimal.max}
        />
      </div>

      {/* Période et légende */}
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-1">
          <span>◀</span>
          <span>{data.periodStart} - {data.periodEnd}</span>
          <span>▶</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 border-t-2 border-dashed border-[var(--text-tertiary)]" />
          <span>Plage optimale</span>
        </div>
      </div>
    </Card>
  );
}
