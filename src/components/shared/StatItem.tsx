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
      <div className={`flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 ${className ?? ""}`}>
        <div className="rounded-lg bg-[var(--bg-surface-hover)] p-2">{icon}</div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
          {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 ${className ?? ""}`}>
        <div className="mb-1 flex items-center gap-1.5">
          {icon}
          <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
      </div>
    );
  }

  // inline (default)
  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
