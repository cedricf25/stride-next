interface LegendItem {
  label: string;
  color: string;
  shape?: "square" | "line" | "dashed" | "circle";
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
}

function Indicator({ color, shape = "square" }: Pick<LegendItem, "color" | "shape">) {
  switch (shape) {
    case "line":
      return <span className={`inline-block h-0.5 w-4 ${color}`} />;
    case "dashed":
      return <span className={`inline-block h-0.5 w-4 ${color}`} style={{ borderTop: "1px dashed" }} />;
    case "circle":
      return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
    default:
      return <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />;
  }
}

export default function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={className ?? "mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)] md:gap-3"}>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <Indicator color={item.color} shape={item.shape} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
