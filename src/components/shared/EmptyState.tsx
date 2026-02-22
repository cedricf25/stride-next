import Card from "./Card";

interface EmptyStateProps {
  title?: string;
  message: string;
  variant?: "card" | "dashed";
  className?: string;
}

export default function EmptyState({
  title,
  message,
  variant = "card",
  className,
}: EmptyStateProps) {
  if (variant === "dashed") {
    return (
      <div
        className={`rounded-2xl border border-dashed border-gray-300 p-12 text-center ${className ?? ""}`}
      >
        <p className="text-gray-500">{message}</p>
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
