import Card from "./Card";

interface EmptyStateProps {
  title?: string;
  message: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "card" | "dashed";
  className?: string;
}

export default function EmptyState({
  title,
  message,
  subtitle,
  icon,
  variant = "card",
  className,
}: EmptyStateProps) {
  if (variant === "dashed") {
    return (
      <div
        className={`rounded-2xl border border-dashed border-gray-300 p-12 text-center ${className ?? ""}`}
      >
        {icon && (
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-gray-400">
            {icon}
          </div>
        )}
        <p className="text-gray-500">{message}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      )}
      <p className="text-sm text-gray-500">{message}</p>
    </Card>
  );
}
