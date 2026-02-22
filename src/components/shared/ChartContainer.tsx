import Card from "./Card";

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
  className?: string;
}

export default function ChartContainer({
  title,
  children,
  legend,
  className,
}: ChartContainerProps) {
  return (
    <Card className={className}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      {children}
      {legend}
    </Card>
  );
}
