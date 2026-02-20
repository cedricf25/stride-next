import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Smile } from "lucide-react";
import type { FatigueTrendData } from "@/actions/health";
import { polylinePath, scaleLinear } from "@/lib/chart-utils";

interface Props {
  data: FatigueTrendData;
}

const W = 600;
const H = 140;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

function trendIcon(trend: string) {
  switch (trend) {
    case "rising":
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

function fatigueColor(score: number) {
  if (score >= 60) return "text-red-600";
  if (score >= 35) return "text-orange-500";
  return "text-green-600";
}

function fatigueLabel(score: number) {
  if (score >= 60) return { text: "Fatigué", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200" };
  if (score >= 35) return { text: "Modéré", icon: Zap, color: "text-orange-600 bg-orange-50 border-orange-200" };
  return { text: "Frais", icon: Smile, color: "text-green-600 bg-green-50 border-green-200" };
}

export default function FatigueTrendCard({ data }: Props) {
  const { days, currentFatigue, trend, message } = data;

  if (days.length < 3) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">
          Pas assez de données pour afficher la tendance de fatigue.
        </p>
      </div>
    );
  }

  const scores = days.map((d) => d.fatigueScore);
  const maxY = Math.max(...scores, 60);
  const xScale = scaleLinear([0, days.length - 1], [PAD.left, W - PAD.right]);
  const yScale = scaleLinear([0, maxY], [H - PAD.bottom, PAD.top]);

  const points = days.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.fatigueScore),
  }));

  // Aire sous la courbe
  const areaPath =
    `M ${points[0].x} ${H - PAD.bottom} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${H - PAD.bottom} Z`;

  const status = fatigueLabel(currentFatigue);
  const StatusIcon = status.icon;

  // Barres de charge d'entraînement
  const loads = days.map((d) => d.trainingLoad);
  const maxLoad = Math.max(...loads, 5);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Tendance fatigue (14j)
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.color}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {status.text}
          </span>
          <span className={`text-lg font-bold ${fatigueColor(currentFatigue)}`}>
            {currentFatigue}
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Zone danger */}
        <rect
          x={PAD.left}
          y={yScale(maxY)}
          width={W - PAD.left - PAD.right}
          height={yScale(60) - yScale(maxY)}
          fill="#fef2f2"
          opacity="0.5"
        />
        <line
          x1={PAD.left}
          y1={yScale(60)}
          x2={W - PAD.right}
          y2={yScale(60)}
          stroke="#fca5a5"
          strokeDasharray="4 4"
          strokeWidth="1"
        />

        {/* Barres de charge */}
        {days.map((d, i) => {
          if (d.trainingLoad === 0) return null;
          const barW = Math.max((W - PAD.left - PAD.right) / days.length - 2, 3);
          const barH =
            (d.trainingLoad / maxLoad) * (H - PAD.top - PAD.bottom) * 0.3;
          return (
            <rect
              key={`bar-${d.date}`}
              x={xScale(i) - barW / 2}
              y={H - PAD.bottom - barH}
              width={barW}
              height={barH}
              fill="#3b82f6"
              opacity="0.2"
              rx="1"
            />
          );
        })}

        {/* Aire */}
        <path d={areaPath} fill="url(#fatigueGrad)" opacity="0.3" />
        <defs>
          <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Ligne */}
        <path
          d={polylinePath(points)}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={days[i].date}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={days[i].fatigueScore >= 60 ? "#ef4444" : days[i].fatigueScore >= 35 ? "#f97316" : "#22c55e"}
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* Labels dates (tous les 3-4 jours) */}
        {days.map((d, i) => {
          if (i % Math.ceil(days.length / 5) !== 0 && i !== days.length - 1) return null;
          return (
            <text
              key={`lbl-${d.date}`}
              x={xScale(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Message + tendance */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        {trendIcon(trend)}
        <span>{message}</span>
      </div>

      {/* Légende */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
          Fatigue
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-blue-400 opacity-30" />
          Charge
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-4 border-t border-dashed border-red-300" />
          Seuil
        </span>
      </div>
    </div>
  );
}
