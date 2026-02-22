import { formatShortDate, polylinePath, scaleLinear } from "@/lib/chart-utils";
import EmptyState from "@/components/shared/EmptyState";
import ChartContainer from "@/components/shared/ChartContainer";
import ChartLegend from "@/components/shared/ChartLegend";

interface SleepData {
  calendarDate: Date;
  startBodyBattery: number | null;
  endBodyBattery: number | null;
  bodyBatteryChange: number | null;
}

interface Props {
  data: SleepData[];
}

export default function BodyBatteryHistoryChart({ data }: Props) {
  const filtered = data.filter((d) => d.endBodyBattery != null);

  if (filtered.length === 0) {
    return (
      <EmptyState title="Body Battery — Historique" message="Aucune donnée" />
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const xScale = scaleLinear([0, filtered.length - 1], [pad.left, pad.left + chartW]);
  const yScale = scaleLinear([0, 100], [pad.top + chartH, pad.top]);

  const endPoints = filtered.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.endBodyBattery!),
  }));

  const startData = filtered.filter((d) => d.startBodyBattery != null);
  const startPoints = startData.map((d) => ({
    x: xScale(filtered.indexOf(d)),
    y: yScale(d.startBodyBattery!),
  }));

  // Zones de couleur
  const zones = [
    { y1: yScale(100), y2: yScale(75), fill: "#dcfce7" },
    { y1: yScale(75), y2: yScale(50), fill: "#dbeafe" },
    { y1: yScale(50), y2: yScale(25), fill: "#fff7ed" },
    { y1: yScale(25), y2: yScale(0), fill: "#fef2f2" },
  ];

  return (
    <ChartContainer
      title="Body Battery — Historique"
      legend={
        <ChartLegend
          className="mt-2 flex gap-4 text-xs text-gray-500"
          items={[
            { label: "Fin de nuit", color: "bg-green-500", shape: "line" },
            { label: "Début de nuit", color: "bg-gray-300", shape: "dashed" },
          ]}
        />
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Zones de couleur */}
        {zones.map((z, i) => (
          <rect
            key={i}
            x={pad.left}
            y={z.y1}
            width={chartW}
            height={z.y2 - z.y1}
            fill={z.fill}
            opacity="0.4"
          />
        ))}

        {/* Grille */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = yScale(v);
          return (
            <g key={v}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="#e5e7eb" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize="8" className="fill-gray-400">
                {v}
              </text>
            </g>
          );
        })}

        {/* Ligne début de nuit */}
        {startPoints.length > 1 && (
          <>
            <path d={polylinePath(startPoints)} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 2" />
            {startPoints.map((p, i) => (
              <circle key={`s${i}`} cx={p.x} cy={p.y} r="2" fill="#d1d5db" />
            ))}
          </>
        )}

        {/* Ligne fin de nuit */}
        <path d={polylinePath(endPoints)} fill="none" stroke="#22c55e" strokeWidth="2" />
        {endPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#22c55e" />
        ))}

        {/* Labels X */}
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
