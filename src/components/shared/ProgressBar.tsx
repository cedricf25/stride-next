interface ProgressBarProps {
  value: number;
  color?: string;
  height?: "sm" | "md";
  className?: string;
}

const heightMap = {
  sm: "h-1.5",
  md: "h-2",
} as const;

export default function ProgressBar({
  value,
  color = "bg-blue-500",
  height = "sm",
  className,
}: ProgressBarProps) {
  const h = heightMap[height];

  return (
    <div className={`${h} w-full rounded-full bg-gray-100 ${className ?? ""}`}>
      <div
        className={`${h} rounded-full ${color}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
