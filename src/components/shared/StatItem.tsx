interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | null;
  variant?: "inline" | "card" | "widget";
  className?: string;
}

export default function StatItem({
  icon,
  label,
  value,
  sub,
  variant = "inline",
  className,
}: StatItemProps) {
  if (variant === "widget") {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 ${className ?? ""}`}>
        <div className="rounded-lg bg-gray-50 p-2">{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white px-4 py-3 ${className ?? ""}`}>
        <div className="mb-1 flex items-center gap-1.5">
          {icon}
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    );
  }

  // inline (default)
  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
