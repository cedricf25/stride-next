import { formatShortDate, polylinePath, scaleLinear } from "@/lib/chart-utils";
import EmptyState from "@/components/shared/EmptyState";
import ChartContainer from "@/components/shared/ChartContainer";
import ChartLegend from "@/components/shared/ChartLegend";

interface SleepData {
  calendarDate: Date;
  avgSleepStress: number | null;
}

interface Props {
  data: SleepData[];
}

export default function StressChart({ data }: Props) {
  const filtered = data.filter((d) => d.avgSleepStress != null);

  if (filtered.length === 0) {
    return (
      <EmptyState title="Stress" message="Aucune donnée de stress" />
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = filtered.map((d) => d.avgSleepStress!);
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);

  const xScale = scaleLinear([0, filtered.length - 1], [pad.left, pad.left + chartW]);
  const yScale = scaleLinear([min, max], [pad.top + chartH, pad.top]);

  const points = filtered.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.avgSleepStress!),
  }));

  // 7-day moving average
  const maPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const start = Math.max(0, i - 6);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    maPoints.push({ x: xScale(i), y: yScale(avg) });
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = yScale(avg);

  // Color based on stress level (lower is better)
  const getStressColor = (value: number) => {
    if (value <= 25) return "#22c55e"; // green - low stress
    if (value <= 50) return "#eab308"; // yellow - moderate
    if (value <= 75) return "#f97316"; // orange - elevated
    return "#ef4444"; // red - high
  };

  return (
    <ChartContainer
      title="Stress"
      legend={
        <ChartLegend
          className="mt-2 flex gap-4 text-xs text-[var(--text-tertiary)]"
          items={[
            { label: "Quotidien", color: "bg-orange-300", shape: "line" },
            { label: "Moyenne 7j", color: "bg-orange-500", shape: "line" },
          ]}
        />
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + chartH * (1 - t);
          const val = Math.round(min + (max - min) * t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="var(--chart-grid)" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize="8" className="fill-[var(--text-muted)]">
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
          stroke="#f97316"
          strokeDasharray="4 2"
          strokeWidth="1"
        />
        <text x={pad.left + chartW + 2} y={avgY + 3} fontSize="8" className="fill-orange-500">
          {Math.round(avg)}
        </text>

        {/* Raw data line */}
        <path d={polylinePath(points)} fill="none" stroke="#fdba74" strokeWidth="1.5" />

        {/* Data points with color coding */}
        {filtered.map((d, i) => (
          <circle
            key={i}
            cx={points[i].x}
            cy={points[i].y}
            r="2.5"
            fill={getStressColor(d.avgSleepStress!)}
          />
        ))}

        {/* Moving average */}
        {maPoints.length > 1 && (
          <path d={polylinePath(maPoints)} fill="none" stroke="#f97316" strokeWidth="2" />
        )}

        {/* X labels */}
        {filtered.map((d, i) =>
          i % Math.max(1, Math.floor(filtered.length / 6)) === 0 ? (
            <text
              key={i}
              x={xScale(i)}
              y={H - 5}
              textAnchor="middle"
              fontSize="8"
              className="fill-[var(--text-muted)]"
            >
              {formatShortDate(new Date(d.calendarDate))}
            </text>
          ) : null
        )}
      </svg>
    </ChartContainer>
  );
}
