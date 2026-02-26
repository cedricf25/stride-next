"use client";

import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Card, SectionHeader, ChartLegend } from "@/components/shared";
import { polylinePath, scaleLinear, formatShortDate } from "@/lib/chart-utils";
import type { PredictionsResult } from "@/types/predictions";

interface EvolutionDataPoint {
  date: Date;
  batchId: string;
  predictions: Record<string, number>; // distance -> temps en secondes
}

interface PredictionEvolutionChartProps {
  batches: PredictionsResult[];
}

const DISTANCES = [
  { key: "5km", label: "5K", color: "#3b82f6" }, // blue
  { key: "10km", label: "10K", color: "#10b981" }, // green
  { key: "semi-marathon", label: "Semi", color: "#f59e0b" }, // orange
  { key: "marathon", label: "Marathon", color: "#ef4444" }, // red
  { key: "trail", label: "Trail 50K", color: "#8b5cf6" }, // purple
];

// Parse un temps en secondes
function parseTime(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Formate des secondes en temps lisible (mm:ss ou h:mm)
function formatTime(seconds: number): string {
  if (seconds < 3600) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${String(sec).padStart(2, "0")}`;
  }
  const hours = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  return `${hours}h${String(min).padStart(2, "0")}`;
}

export default function PredictionEvolutionChart({
  batches,
}: PredictionEvolutionChartProps) {
  const [selectedDistance, setSelectedDistance] = useState("10km");

  // Transformer les batches en données pour le graphique
  const dataPoints: EvolutionDataPoint[] = useMemo(() => {
    return batches
      .map((batch) => ({
        date: new Date(batch.generatedAt),
        batchId: batch.id,
        predictions: batch.predictions.reduce(
          (acc, p) => {
            acc[p.distance] = parseTime(p.predictedTime);
            return acc;
          },
          {} as Record<string, number>
        ),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [batches]);

  if (dataPoints.length < 2) {
    return null;
  }

  // Dimensions du graphique
  const width = 320;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculer les échelles
  const selectedData = DISTANCES.find((d) => d.key === selectedDistance);
  const values = dataPoints
    .map((d) => d.predictions[selectedDistance])
    .filter((v) => v > 0);

  if (values.length === 0) {
    return null;
  }

  const minTime = Math.min(...values);
  const maxTime = Math.max(...values);
  const timeRange = maxTime - minTime || 60; // Au moins 1 minute de range

  const xScale = scaleLinear(
    [0, dataPoints.length - 1],
    [padding.left, width - padding.right]
  );
  const yScale = scaleLinear(
    [minTime - timeRange * 0.1, maxTime + timeRange * 0.1],
    [height - padding.bottom, padding.top]
  );

  // Générer les points pour la ligne
  const linePoints = dataPoints
    .map((d, i) => {
      const val = d.predictions[selectedDistance];
      if (!val) return null;
      return { x: xScale(i), y: yScale(val) };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  // Générer les graduations Y (3 niveaux)
  const yTicks = [minTime, (minTime + maxTime) / 2, maxTime].map((v) =>
    Math.round(v)
  );

  return (
    <Card padding="md">
      <SectionHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="Évolution"
        size="sm"
      />

      {/* Distance selector */}
      <div className="mt-3 flex flex-wrap gap-1">
        {DISTANCES.map((d) => {
          const hasData = dataPoints.some((dp) => dp.predictions[d.key] > 0);
          if (!hasData) return null;

          return (
            <button
              key={d.key}
              onClick={() => setSelectedDistance(d.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedDistance === d.key
                  ? "text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
              style={{
                backgroundColor:
                  selectedDistance === d.key ? d.color : undefined,
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full">
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="var(--border-default)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <text
              x={padding.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              {formatTime(tick)}
            </text>
          </g>
        ))}

        {/* Line */}
        <path
          d={polylinePath(linePoints)}
          fill="none"
          stroke={selectedData?.color ?? "#3b82f6"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {linePoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={selectedData?.color ?? "#3b82f6"}
          />
        ))}

        {/* X axis labels */}
        {dataPoints.map((d, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize={9}
            fill="var(--text-tertiary)"
          >
            {formatShortDate(d.date)}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-3">
        <ChartLegend
          items={[
            {
              label: selectedData?.label ?? selectedDistance,
              color: selectedData?.color ?? "#3b82f6",
              shape: "line",
            },
          ]}
        />
      </div>

      {/* Summary */}
      {values.length >= 2 && (
        <div className="mt-3 text-center text-xs text-[var(--text-tertiary)]">
          {values[values.length - 1] < values[0] ? (
            <span className="text-green-600">
              ↓ Progression de{" "}
              {formatTime(Math.abs(values[0] - values[values.length - 1]))}
            </span>
          ) : values[values.length - 1] > values[0] ? (
            <span className="text-orange-600">
              ↑ Régression de{" "}
              {formatTime(Math.abs(values[values.length - 1] - values[0]))}
            </span>
          ) : (
            <span>Stable</span>
          )}
        </div>
      )}
    </Card>
  );
}
