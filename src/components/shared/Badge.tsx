type BadgeColor = "blue" | "green" | "red" | "orange" | "gray" | "purple";
type BadgeVariant = "soft" | "outline";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const softClasses: Record<BadgeColor, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-700",
};

const outlineClasses: Record<BadgeColor, string> = {
  blue: "border border-blue-200 bg-blue-50 text-blue-700",
  green: "border border-green-200 bg-green-50 text-green-700",
  red: "border border-red-200 bg-red-50 text-red-700",
  orange: "border border-orange-200 bg-orange-50 text-orange-700",
  gray: "border border-gray-200 bg-gray-50 text-gray-700",
  purple: "border border-purple-200 bg-purple-50 text-purple-700",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2",
  md: "px-3",
};

const BASE = "inline-flex items-center gap-1 rounded-full py-0.5 text-xs font-medium";

export default function Badge({
  color = "gray",
  variant = "soft",
  size = "sm",
  icon,
  className,
  children,
}: BadgeProps) {
  const colorClass =
    variant === "outline" ? outlineClasses[color] : softClasses[color];

  return (
    <span className={`${BASE} ${colorClass} ${sizeClasses[size]} ${className ?? ""}`}>
      {icon}
      {children}
    </span>
  );
}
