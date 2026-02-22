import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Zap,
  Smile,
  Activity,
  Heart,
  Brain,
  Moon,
} from "lucide-react";
import type { FatigueTrendData } from "@/actions/health";
import { polylinePath, scaleLinear } from "@/lib/chart-utils";
import { Card, EmptyState, Badge } from "@/components/shared";

interface Props {
  data: FatigueTrendData;
}

const W = 600;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

const ZONES = [
  { min: 0, max: 35, label: "Frais", color: "#dcfce7", labelColor: "#16a34a" },
  { min: 35, max: 60, label: "Modéré", color: "#fef9c3", labelColor: "#ca8a04" },
  { min: 60, max: 100, label: "Fatigué", color: "#fee2e2", labelColor: "#dc2626" },
];

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
  if (score >= 60)
    return {
      text: "Fatigué",
      icon: AlertTriangle,
      badgeColor: "red" as const,
    };
  if (score >= 35)
    return {
      text: "Modéré",
      icon: Zap,
      badgeColor: "orange" as const,
    };
  return {
    text: "Frais",
    icon: Smile,
    badgeColor: "green" as const,
  };
}

function factorScore(value: number | null, type: "hr" | "hrv" | "sleep" | "te") {
  if (value === null) return null;
  switch (type) {
    case "te":
      return Math.round(Math.min(value / 5, 1) * 100);
    case "hr":
      return Math.round(Math.min(Math.max((value - 45) / 30, 0), 1) * 100);
    case "hrv":
      return Math.round((1 - Math.min(Math.max((value - 20) / 80, 0), 1)) * 100);
    case "sleep":
      return Math.round(100 - value);
  }
}

function factorLevel(score: number): { label: string; color: string } {
  if (score >= 60) return { label: "Élevé", color: "text-red-500" };
  if (score >= 35) return { label: "Moyen", color: "text-orange-500" };
  return { label: "Bas", color: "text-green-500" };
}

export default function FatigueTrendCard({ data }: Props) {
  const { days, currentFatigue, trend, message } = data;

  if (days.length < 3) {
    return (
      <EmptyState message="Pas assez de données pour afficher la tendance de fatigue." />
    );
  }

  const scores = days.map((d) => d.fatigueScore);
  const maxY = Math.max(...scores, 65);
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
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

  // Dernières valeurs disponibles pour le breakdown
  const latest = [...days].reverse();
  const latestTE = latest.find((d) => d.trainingLoad > 0);
  const latestHR = latest.find((d) => d.restingHR !== null);
  const latestHRV = latest.find((d) => d.hrv !== null);
  const latestSleep = latest.find((d) => d.sleepScore !== null);

  const factors = [
    {
      icon: Activity,
      label: "Entraînement",
      value: latestTE ? `TE ${latestTE.trainingLoad.toFixed(1)}` : "—",
      score: latestTE ? factorScore(latestTE.trainingLoad, "te") : null,
      desc: "Training Effect aérobie",
    },
    {
      icon: Heart,
      label: "FC repos",
      value: latestHR?.restingHR ? `${latestHR.restingHR} bpm` : "—",
      score: latestHR?.restingHR ? factorScore(latestHR.restingHR, "hr") : null,
      desc: "Fréquence cardiaque au repos",
    },
    {
      icon: Brain,
      label: "HRV",
      value: latestHRV?.hrv ? `${latestHRV.hrv} ms` : "—",
      score: latestHRV?.hrv ? factorScore(latestHRV.hrv, "hrv") : null,
      desc: "Variabilité cardiaque nocturne",
    },
    {
      icon: Moon,
      label: "Sommeil",
      value: latestSleep?.sleepScore ? `${latestSleep.sleepScore}/100` : "—",
      score: latestSleep?.sleepScore ? factorScore(latestSleep.sleepScore, "sleep") : null,
      desc: "Score de qualité du sommeil",
    },
  ];

  return (
    <Card padding="md">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Indice de fatigue
          </h3>
          <p className="text-[11px] text-gray-400">
            Calculé à partir de vos données Garmin (14 derniers jours)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            color={status.badgeColor}
            variant="outline"
            icon={<StatusIcon className="h-3.5 w-3.5" />}
          >
            {status.text}
          </Badge>
          <span
            className={`text-xl font-bold ${fatigueColor(currentFatigue)}`}
          >
            {currentFatigue}
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
        {/* Zones colorées */}
        {ZONES.map((zone) => {
          const clampedMax = Math.min(zone.max, maxY);
          if (zone.min >= maxY) return null;
          return (
            <g key={zone.label}>
              <rect
                x={PAD.left}
                y={yScale(clampedMax)}
                width={chartW}
                height={yScale(zone.min) - yScale(clampedMax)}
                fill={zone.color}
                opacity="0.5"
              />
              {/* Label de zone à droite */}
              {clampedMax > zone.min && (
                <text
                  x={W - PAD.right - 2}
                  y={(yScale(zone.min) + yScale(clampedMax)) / 2 + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill={zone.labelColor}
                  opacity="0.7"
                >
                  {zone.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Lignes de seuil */}
        {[35, 60].map((threshold) =>
          threshold <= maxY ? (
            <line
              key={`th-${threshold}`}
              x1={PAD.left}
              y1={yScale(threshold)}
              x2={W - PAD.right}
              y2={yScale(threshold)}
              stroke={threshold === 60 ? "#fca5a5" : "#fde68a"}
              strokeDasharray="4 3"
              strokeWidth="1"
            />
          ) : null
        )}

        {/* Labels axe Y */}
        {[0, 35, 60].map((val) =>
          val <= maxY ? (
            <text
              key={`y-${val}`}
              x={PAD.left - 4}
              y={yScale(val) + 3}
              textAnchor="end"
              fontSize="8"
              fill="#9ca3af"
            >
              {val}
            </text>
          ) : null
        )}

        {/* Barres d'entraînement */}
        {days.map((d, i) => {
          if (d.trainingLoad === 0) return null;
          const barW = Math.max(chartW / days.length - 4, 4);
          const barH = (d.trainingLoad / maxLoad) * chartH * 0.35;
          return (
            <g key={`bar-${d.date}`}>
              <rect
                x={xScale(i) - barW / 2}
                y={H - PAD.bottom - barH}
                width={barW}
                height={barH}
                fill="#3b82f6"
                opacity="0.15"
                rx="2"
              />
              {/* Petit indicateur d'activité en haut de la barre */}
              <circle
                cx={xScale(i)}
                cy={H - PAD.bottom - barH - 4}
                r="2"
                fill="#3b82f6"
                opacity="0.4"
              />
            </g>
          );
        })}

        {/* Gradient pour l'aire */}
        <defs>
          <linearGradient id="fatigueAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Aire sous la courbe */}
        <path d={areaPath} fill="url(#fatigueAreaGrad)" />

        {/* Ligne de fatigue */}
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
            r="3.5"
            fill={
              days[i].fatigueScore >= 60
                ? "#ef4444"
                : days[i].fatigueScore >= 35
                  ? "#f97316"
                  : "#22c55e"
            }
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* Labels dates */}
        {days.map((d, i) => {
          if (
            i % Math.ceil(days.length / 5) !== 0 &&
            i !== days.length - 1
          )
            return null;
          return (
            <text
              key={`lbl-${d.date}`}
              x={xScale(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Tendance */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        {trendIcon(trend)}
        <span>{message}</span>
      </div>

      {/* Breakdown des 4 facteurs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {factors.map((f) => {
          const Icon = f.icon;
          const level = f.score !== null ? factorLevel(f.score) : null;
          return (
            <div
              key={f.label}
              className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-[11px] font-medium text-gray-600">
                  {f.label}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-900">
                  {f.value}
                </span>
                {level && (
                  <span className={`text-[10px] font-medium ${level.color}`}>
                    {level.label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] leading-tight text-gray-400">
                {f.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
          Score de fatigue
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400 opacity-30" />
          Charge d&apos;entraînement (TE)
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-0 w-4 border-t border-dashed border-red-300"
          />
          Seuils (35 / 60)
        </span>
      </div>
    </Card>
  );
}
