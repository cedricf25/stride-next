interface AlertBannerProps {
  variant?: "error" | "info";
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-100 bg-blue-50 text-blue-800",
};

const BASE = "flex items-start gap-3 rounded-xl border p-4";

export default function AlertBanner({
  variant = "error",
  icon,
  className,
  children,
}: AlertBannerProps) {
  return (
    <div className={`${BASE} ${variantClasses[variant]} ${className ?? ""}`}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div>{children}</div>
    </div>
  );
}
