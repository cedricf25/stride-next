import { formatShortDate, polylinePath, scaleLinear } from "@/lib/chart-utils";
import EmptyState from "@/components/shared/EmptyState";
import ChartContainer from "@/components/shared/ChartContainer";

interface SleepData {
  calendarDate: Date;
  avgOvernightHRV: number | null;
}

interface Props {
  data: SleepData[];
}

export default function HrvChart({ data }: Props) {
  const filtered = data.filter((d) => d.avgOvernightHRV != null);

  if (filtered.length === 0) {
    return (
      <EmptyState title="HRV nocturne" message="Aucune donnée HRV" />
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = filtered.map((d) => d.avgOvernightHRV!);
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;

  const xScale = scaleLinear([0, filtered.length - 1], [pad.left, pad.left + chartW]);
  const yScale = scaleLinear([min, max], [pad.top + chartH, pad.top]);

  const points = filtered.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.avgOvernightHRV!),
  }));

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = yScale(avg);

  return (
    <ChartContainer title="HRV nocturne">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + chartH * (1 - t);
          const val = Math.round(min + (max - min) * t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="#f3f4f6" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize="8" className="fill-gray-400">
                {val}
              </text>
            </g>
          );
        })}

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
        <text x={pad.left + chartW + 2} y={avgY + 3} fontSize="8" className="fill-green-600">
          {Math.round(avg)}
        </text>

        {/* Line */}
        <path d={polylinePath(points)} fill="none" stroke="#8b5cf6" strokeWidth="2" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#8b5cf6" />
        ))}

        {/* X labels */}
        {filtered.map((d, i) =>
          i % Math.max(1, Math.floor(filtered.length / 6)) === 0 ? (
            <text
              key={i}
              x={xScale(i)}
              y={H - 5}
              textAnchor="middle"
              fontSize="8"
              className="fill-gray-400"
            >
              {formatShortDate(new Date(d.calendarDate))}
            </text>
          ) : null
        )}
      </svg>
    </ChartContainer>
  );
}
