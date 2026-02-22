interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const BASE =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={`${BASE} ${className ?? ""}`} {...props}>
      {children}
    </select>
  );
}
