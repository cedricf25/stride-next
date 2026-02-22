import { formatShortDate, polylinePath, scaleLinear } from "@/lib/chart-utils";
import EmptyState from "@/components/shared/EmptyState";
import ChartContainer from "@/components/shared/ChartContainer";
import ChartLegend from "@/components/shared/ChartLegend";

interface HealthData {
  calendarDate: Date;
  restingHeartRate: number | null;
}

interface Props {
  data: HealthData[];
}

export default function RestingHRChart({ data }: Props) {
  const filtered = data.filter((d) => d.restingHeartRate != null);

  if (filtered.length === 0) {
    return (
      <EmptyState title="FC repos" message="Aucune donnée" />
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = filtered.map((d) => d.restingHeartRate!);
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;

  const xScale = scaleLinear([0, filtered.length - 1], [pad.left, pad.left + chartW]);
  const yScale = scaleLinear([min, max], [pad.top + chartH, pad.top]);

  const points = filtered.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.restingHeartRate!),
  }));

  // 7-day moving average
  const maPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const start = Math.max(0, i - 6);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    maPoints.push({ x: xScale(i), y: yScale(avg) });
  }

  return (
    <ChartContainer
      title="FC repos"
      legend={
        <ChartLegend
          className="mt-2 flex gap-4 text-xs text-gray-500"
          items={[
            { label: "Quotidien", color: "bg-[#fca5a5]", shape: "line" },
            { label: "Moyenne 7j", color: "bg-[#ef4444]", shape: "line" },
          ]}
        />
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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

        {/* Raw data */}
        <path d={polylinePath(points)} fill="none" stroke="#fca5a5" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#fca5a5" />
        ))}

        {/* Moving average */}
        {maPoints.length > 1 && (
          <path d={polylinePath(maPoints)} fill="none" stroke="#ef4444" strokeWidth="2" />
        )}

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
