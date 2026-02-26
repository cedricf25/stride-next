interface AlertBannerProps {
  variant?: "error" | "info" | "warning";
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
  info: "border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  warning: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
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
