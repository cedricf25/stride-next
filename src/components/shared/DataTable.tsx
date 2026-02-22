interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] ${className ?? ""}`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-left text-xs text-[var(--text-tertiary)]">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.className ?? "px-4 py-2 text-[var(--text-secondary)]"}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
