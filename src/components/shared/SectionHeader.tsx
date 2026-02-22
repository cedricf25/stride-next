interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  as?: "h2" | "h3";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const sizeMap = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
} as const;

export default function SectionHeader({
  icon,
  title,
  as: Tag = "h3",
  size = "md",
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className ?? ""}`}>
      <Tag className={`flex items-center gap-2 ${sizeMap[size]} font-semibold text-[var(--text-primary)]`}>
        {icon}
        {title}
      </Tag>
      {children}
    </div>
  );
}
