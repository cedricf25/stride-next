import { formatShortDate, scaleLinear } from "@/lib/chart-utils";
import EmptyState from "@/components/shared/EmptyState";
import ChartContainer from "@/components/shared/ChartContainer";
import ChartLegend from "@/components/shared/ChartLegend";

interface HealthData {
  calendarDate: Date;
  totalSteps: number | null;
}

interface Props {
  data: HealthData[];
}

export default function StepsChart({ data }: Props) {
  const filtered = data.filter((d) => d.totalSteps != null);

  if (filtered.length === 0) {
    return (
      <EmptyState title="Pas quotidiens" message="Aucune donnée" />
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 10, bottom: 30, left: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = Math.max(4, (chartW / filtered.length) * 0.7);
  const gap = chartW / filtered.length;

  const values = filtered.map((d) => d.totalSteps!);
  const maxVal = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const yScale = scaleLinear([0, maxVal], [0, chartH]);
  const avgY = pad.top + chartH - yScale(avg);

  return (
    <ChartContainer
      title="Pas quotidiens"
      legend={
        <ChartLegend
          className="mt-2 flex gap-4 text-xs text-gray-500"
          items={[
            { label: "10 000+", color: "bg-green-500" },
            { label: "7 000+", color: "bg-blue-500" },
            { label: "< 7 000", color: "bg-gray-400" },
          ]}
        />
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Average line */}
        <line
          x1={pad.left}
          y1={avgY}
          x2={pad.left + chartW}
          y2={avgY}
          stroke="#10b981"
          strokeDasharray="4 2"
          strokeWidth="1"
        />
        <text x={pad.left + chartW + 2} y={avgY - 4} fontSize="7" className="fill-green-600">
          {Math.round(avg).toLocaleString("fr-FR")}
        </text>

        {filtered.map((d, i) => {
          const steps = d.totalSteps!;
          const x = pad.left + i * gap + gap / 2 - barW / 2;
          const h = yScale(steps);
          const y = pad.top + chartH - h;
          const color = steps >= 10000 ? "#22c55e" : steps >= 7000 ? "#3b82f6" : "#94a3b8";

          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill={color} rx="2" />
              {i % Math.max(1, Math.floor(filtered.length / 6)) === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 5}
                  textAnchor="middle"
                  fontSize="8"
                  className="fill-gray-400"
                >
                  {formatShortDate(new Date(d.calendarDate))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </ChartContainer>
  );
}
