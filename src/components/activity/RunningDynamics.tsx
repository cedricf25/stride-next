import Card from "@/components/shared/Card";
import EmptyState from "@/components/shared/EmptyState";

interface Props {
  activity: {
    averageCadence: number | null;
    averageStrideLength: number | null;
    averageGCT: number | null;
    averageVerticalOscillation: number | null;
    averageVerticalRatio: number | null;
  };
}

function Bar({ label, value, unit, max, color }: {
  label: string;
  value: number;
  unit: string;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {value} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RunningDynamics({ activity }: Props) {
  const hasData = activity.averageCadence || activity.averageStrideLength ||
    activity.averageGCT || activity.averageVerticalOscillation;

  if (!hasData) {
    return (
      <EmptyState title="Dynamique de course" message="Aucune donnée disponible" />
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Dynamique de course</h3>
      <div className="space-y-4">
        {activity.averageCadence != null && (
          <Bar
            label="Cadence"
            value={Math.round(activity.averageCadence)}
            unit="spm"
            max={200}
            color="bg-blue-500"
          />
        )}
        {activity.averageStrideLength != null && (
          <Bar
            label="Longueur de foulée"
            value={+(activity.averageStrideLength / 100).toFixed(2)}
            unit="m"
            max={2}
            color="bg-green-500"
          />
        )}
        {activity.averageGCT != null && (
          <Bar
            label="Temps de contact au sol"
            value={Math.round(activity.averageGCT)}
            unit="ms"
            max={350}
            color="bg-orange-500"
          />
        )}
        {activity.averageVerticalOscillation != null && (
          <Bar
            label="Oscillation verticale"
            value={+activity.averageVerticalOscillation.toFixed(1)}
            unit="cm"
            max={15}
            color="bg-purple-500"
          />
        )}
        {activity.averageVerticalRatio != null && (
          <Bar
            label="Ratio vertical"
            value={+activity.averageVerticalRatio.toFixed(1)}
            unit="%"
            max={15}
            color="bg-indigo-500"
          />
        )}
      </div>
    </Card>
  );
}
