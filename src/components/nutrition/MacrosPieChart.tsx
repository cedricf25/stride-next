import { MACRO_COLORS } from "@/types/nutrition";

interface MacrosPieChartProps {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

export default function MacrosPieChart({
  protein,
  carbs,
  fat,
  size = 120,
}: MacrosPieChartProps) {
  const total = protein + carbs + fat;

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-[var(--bg-muted)]"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-[var(--text-muted)]">Pas de données</span>
      </div>
    );
  }

  // Calcul des pourcentages
  const proteinPercent = (protein / total) * 100;
  const carbsPercent = (carbs / total) * 100;
  const fatPercent = (fat / total) * 100;

  // Calcul des angles pour le SVG
  const center = size / 2;
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;

  // Fonction pour créer un arc
  const createArc = (
    startAngle: number,
    endAngle: number,
    outerR: number,
    innerR: number
  ) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + outerR * Math.cos(startRad);
    const y1 = center + outerR * Math.sin(startRad);
    const x2 = center + outerR * Math.cos(endRad);
    const y2 = center + outerR * Math.sin(endRad);
    const x3 = center + innerR * Math.cos(endRad);
    const y3 = center + innerR * Math.sin(endRad);
    const x4 = center + innerR * Math.cos(startRad);
    const y4 = center + innerR * Math.sin(startRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

  // Angles pour chaque section
  const proteinAngle = (proteinPercent / 100) * 360;
  const carbsAngle = (carbsPercent / 100) * 360;
  const fatAngle = (fatPercent / 100) * 360;

  let currentAngle = 0;

  const sections = [
    {
      color: MACRO_COLORS.protein,
      angle: proteinAngle,
      label: "P",
      percent: proteinPercent,
      grams: protein,
    },
    {
      color: MACRO_COLORS.carbs,
      angle: carbsAngle,
      label: "G",
      percent: carbsPercent,
      grams: carbs,
    },
    {
      color: MACRO_COLORS.fat,
      angle: fatAngle,
      label: "L",
      percent: fatPercent,
      grams: fat,
    },
  ].filter((s) => s.angle > 0);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {sections.map((section, i) => {
          const startAngle = currentAngle;
          const endAngle = currentAngle + section.angle;
          currentAngle = endAngle;

          // Éviter les arcs de 360° exactement (cercle complet)
          const adjustedEnd =
            section.angle >= 359.9 ? startAngle + 359.9 : endAngle;

          return (
            <path
              key={i}
              d={createArc(startAngle, adjustedEnd, radius, innerRadius)}
              fill={section.color}
              className="transition-all duration-300"
            />
          );
        })}

        {/* Texte central */}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          className="text-xs font-semibold fill-[var(--text-primary)]"
        >
          {total.toFixed(0)}g
        </text>
        <text
          x={center}
          y={center + 10}
          textAnchor="middle"
          className="text-[10px] fill-[var(--text-muted)]"
        >
          total
        </text>
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: MACRO_COLORS.protein }}
          />
          <span className="text-[var(--text-secondary)]">
            P: {protein.toFixed(0)}g ({proteinPercent.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: MACRO_COLORS.carbs }}
          />
          <span className="text-[var(--text-secondary)]">
            G: {carbs.toFixed(0)}g ({carbsPercent.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: MACRO_COLORS.fat }}
          />
          <span className="text-[var(--text-secondary)]">
            L: {fat.toFixed(0)}g ({fatPercent.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
