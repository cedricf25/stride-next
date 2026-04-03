import Card from "./Card";

interface EmptyStateProps {
  title?: string;
  message: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "card" | "dashed";
  className?: string;
  children?: React.ReactNode;
}

export default function EmptyState({
  title,
  message,
  subtitle,
  icon,
  variant = "card",
  className,
  children,
}: EmptyStateProps) {
  if (variant === "dashed") {
    return (
      <div
        className={`rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center ${className ?? ""}`}
      >
        {icon && (
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-[var(--text-muted)]">
            {icon}
          </div>
        )}
        <p className="text-[var(--text-tertiary)]">{message}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
        {children}
      </div>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      )}
      <p className="text-sm text-[var(--text-tertiary)]">{message}</p>
      {children}
    </Card>
  );
}
