type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "6xl";

interface PageContainerProps {
  maxWidth?: MaxWidth;
  children: React.ReactNode;
  className?: string;
}

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "6xl": "max-w-6xl",
};

export default function PageContainer({
  maxWidth = "6xl",
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      className={`mx-auto ${maxWidthClasses[maxWidth]} px-6 py-8 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
