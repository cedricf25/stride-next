import { ChartContainer } from "@/components/shared";
import type { NutritionDayHistory } from "@/types/nutrition";

interface CalorieHistoryChartProps {
  data: NutritionDayHistory[];
}

export default function CalorieHistoryChart({
  data,
}: CalorieHistoryChartProps) {
  if (data.length === 0) {
    return (
      <ChartContainer title="Historique calories">
        <div className="h-48 flex items-center justify-center text-[var(--text-muted)]">
          Aucune donnée
        </div>
      </ChartContainer>
    );
  }

  // Dimensions
  const W = 600;
  const H = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // Filtrer les jours avec des données
  const validData = data.filter((d) => d.intake > 0 || d.mealsCount > 0);

  // Calculer les échelles
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.intake, d.expenditure)),
    2000
  );

  const barWidth = Math.max(4, (chartW / data.length) * 0.35);
  const gap = chartW / data.length;

  // Moyenne
  const avgIntake =
    validData.length > 0
      ? Math.round(
          validData.reduce((sum, d) => sum + d.intake, 0) / validData.length
        )
      : 0;

  return (
    <ChartContainer
      title="Historique calories"
      legend={
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-[var(--text-secondary)]">Consommé</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-400" />
            <span className="text-[var(--text-secondary)]">Dépensé</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-blue-500" />
            <span className="text-[var(--text-secondary)]">
              Moy. consommé ({avgIntake} kcal)
            </span>
          </div>
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = pad.top + chartH * (1 - t);
          const value = Math.round(maxValue * t);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + chartW}
                y2={y}
                stroke="var(--chart-grid)"
                strokeDasharray={t === 0 ? "0" : "4 2"}
              />
              <text
                x={pad.left - 5}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[10px] fill-[var(--text-muted)]"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Barres */}
        {data.map((d, i) => {
          const x = pad.left + i * gap + (gap - barWidth * 2) / 2;
          const intakeH = (d.intake / maxValue) * chartH;
          const expendH = (d.expenditure / maxValue) * chartH;

          return (
            <g key={i}>
              {/* Barre consommé (vert) */}
              <rect
                x={x}
                y={pad.top + chartH - intakeH}
                width={barWidth}
                height={intakeH}
                fill="#22c55e"
                rx="2"
                className="transition-all duration-200"
              />
              {/* Barre dépensé (rouge) */}
              <rect
                x={x + barWidth + 2}
                y={pad.top + chartH - expendH}
                width={barWidth}
                height={expendH}
                fill="#f87171"
                rx="2"
                className="transition-all duration-200"
              />
            </g>
          );
        })}

        {/* Ligne moyenne */}
        {avgIntake > 0 && (
          <line
            x1={pad.left}
            y1={pad.top + chartH - (avgIntake / maxValue) * chartH}
            x2={pad.left + chartW}
            y2={pad.top + chartH - (avgIntake / maxValue) * chartH}
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
        )}

        {/* Labels de dates */}
        {data.map((d, i) => {
          // Afficher une date tous les ~7 jours
          if (i % Math.max(1, Math.floor(data.length / 5)) !== 0) return null;
          const date = new Date(d.date);
          const label = date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          });
          const x = pad.left + i * gap + gap / 2;

          return (
            <text
              key={i}
              x={x}
              y={H - 8}
              textAnchor="middle"
              className="text-[9px] fill-[var(--text-muted)]"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </ChartContainer>
  );
}
