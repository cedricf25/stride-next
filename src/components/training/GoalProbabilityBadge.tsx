interface Props {
  probability: number;
  assessment?: string | null;
}

export default function GoalProbabilityBadge({ probability, assessment }: Props) {
  const clamped = Math.max(0, Math.min(100, probability));

  const color =
    clamped >= 60
      ? "text-green-700 bg-green-50 border-green-200"
      : clamped >= 30
        ? "text-orange-700 bg-orange-50 border-orange-200"
        : "text-red-700 bg-red-50 border-red-200";

  const arcColor =
    clamped >= 60 ? "#22c55e" : clamped >= 30 ? "#f97316" : "#ef4444";

  // Arc SVG (semi-circle gauge)
  const radius = 28;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${color}`}>
      <svg width="64" height="36" viewBox="0 0 64 36">
        {/* Background arc */}
        <path
          d="M 4 32 A 28 28 0 0 1 60 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          opacity="0.2"
        />
        {/* Filled arc */}
        <path
          d="M 4 32 A 28 28 0 0 1 60 32"
          fill="none"
          stroke={arcColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x="32"
          y="30"
          textAnchor="middle"
          fontSize="13"
          fontWeight="bold"
          fill={arcColor}
        >
          {clamped}%
        </text>
      </svg>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide">
          Probabilité objectif
        </div>
        {assessment && (
          <div className="mt-0.5 text-xs opacity-80 line-clamp-2">{assessment}</div>
        )}
      </div>
    </div>
  );
}
