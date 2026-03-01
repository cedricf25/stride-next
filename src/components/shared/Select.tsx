interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const BASE =
  "w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] px-3 py-3 text-base min-h-[44px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:py-2 md:text-sm";

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={`${BASE} ${className ?? ""}`} {...props}>
      {children}
    </select>
  );
}
