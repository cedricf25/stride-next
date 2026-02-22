interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export default function Card({
  children,
  className,
  padding = "lg",
  hover = false,
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white ${paddingMap[padding]} ${hover ? "transition-shadow hover:shadow-md" : ""} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
