import { formatShortDate, polylinePath, scaleLinear } from "@/lib/chart-utils";

interface HealthData {
  calendarDate: Date;
  weight: number | null;
  bodyFatPercentage: number | null;
}

interface Props {
  data: HealthData[];
}

export default function WeightChart({ data }: Props) {
  const filtered = data.filter((d) => d.weight != null);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Poids</h3>
        <p className="text-sm text-gray-500">Aucune donnée de poids</p>
      </div>
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 40, bottom: 30, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const weights = filtered.map((d) => d.weight!);
  const wMin = Math.min(...weights) - 1;
  const wMax = Math.max(...weights) + 1;

  const xScale = scaleLinear([0, filtered.length - 1], [pad.left, pad.left + chartW]);
  const yScale = scaleLinear([wMin, wMax], [pad.top + chartH, pad.top]);

  const weightPoints = filtered.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.weight!),
  }));

  // Body fat on secondary axis
  const fatData = filtered.filter((d) => d.bodyFatPercentage != null);
  let fatPoints: { x: number; y: number }[] = [];
  if (fatData.length > 0) {
    const fatValues = fatData.map((d) => d.bodyFatPercentage!);
    const fMin = Math.min(...fatValues) - 1;
    const fMax = Math.max(...fatValues) + 1;
    const yFat = scaleLinear([fMin, fMax], [pad.top + chartH, pad.top]);
    fatPoints = fatData.map((d, i) => ({
      x: xScale(filtered.indexOf(d)),
      y: yFat(d.bodyFatPercentage!),
    }));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Poids</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + chartH * (1 - t);
          const val = (wMin + (wMax - wMin) * t).toFixed(1);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="#f3f4f6" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize="8" className="fill-gray-400">
                {val}
              </text>
            </g>
          );
        })}

        {/* Weight line */}
        <path d={polylinePath(weightPoints)} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {weightPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3b82f6" />
        ))}

        {/* Body fat line */}
        {fatPoints.length > 1 && (
          <>
            <path d={polylinePath(fatPoints)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
            {fatPoints.map((p, i) => (
              <circle key={`f${i}`} cx={p.x} cy={p.y} r="2" fill="#f59e0b" />
            ))}
          </>
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
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-blue-500" /> Poids (kg)</span>
        {fatPoints.length > 0 && (
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-amber-500" style={{ borderTop: "1px dashed" }} /> Masse grasse (%)</span>
        )}
      </div>
    </div>
  );
}
