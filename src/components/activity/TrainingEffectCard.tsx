import { Zap } from "lucide-react";

interface Props {
  activity: {
    aerobicTrainingEffect: number | null;
    anaerobicTrainingEffect: number | null;
    trainingStressScore: number | null;
    intensityFactor: number | null;
    vo2max: number | null;
  };
}

function teLabel(value: number): string {
  if (value < 1) return "Aucun";
  if (value < 2) return "Mineur";
  if (value < 3) return "Maintien";
  if (value < 4) return "Amélioration";
  if (value < 5) return "Haute amélioration";
  return "Surcharge";
}

function teColor(value: number): string {
  if (value < 2) return "text-gray-500";
  if (value < 3) return "text-blue-600";
  if (value < 4) return "text-green-600";
  if (value < 5) return "text-orange-600";
  return "text-red-600";
}

function Gauge({ value, label, maxValue = 5 }: { value: number; label: string; maxValue?: number }) {
  const angle = (value / maxValue) * 180;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="h-20 w-32">
        {/* Background arc */}
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
          className={teColor(value)}
        />
        <text x="60" y="58" textAnchor="middle" className="fill-gray-900 text-xl font-bold" fontSize="20">
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="mt-1 text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${teColor(value)}`}>{teLabel(value)}</span>
    </div>
  );
}

export default function TrainingEffectCard({ activity }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Zap className="h-5 w-5 text-yellow-500" />
        Training Effect
      </h3>

      <div className="flex items-center justify-around">
        {activity.aerobicTrainingEffect != null && (
          <Gauge value={activity.aerobicTrainingEffect} label="Aérobie" />
        )}
        {activity.anaerobicTrainingEffect != null && (
          <Gauge value={activity.anaerobicTrainingEffect} label="Anaérobie" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
        {activity.trainingStressScore != null && (
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {Math.round(activity.trainingStressScore)}
            </p>
            <p className="text-xs text-gray-500">TSS</p>
          </div>
        )}
        {activity.intensityFactor != null && (
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {activity.intensityFactor.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">IF</p>
          </div>
        )}
        {activity.vo2max != null && (
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {activity.vo2max.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">VO2max</p>
          </div>
        )}
      </div>
    </div>
  );
}
