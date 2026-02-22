import { formatPace } from "@/lib/format";
import Card from "@/components/shared/Card";

interface Split {
  splitNumber: number;
  splitType: string;
  distance: number;
  duration: number;
  averageSpeed: number | null;
  averageHR: number | null;
  maxHR: number | null;
  averageCadence: number | null;
  elevationGain: number | null;
  averageGCT: number | null;
}

interface Props {
  splits: Split[];
}

export default function SplitTable({ splits }: Props) {
  // Find fastest and slowest for color coding
  const speeds = splits.filter((s) => s.averageSpeed).map((s) => s.averageSpeed!);
  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);

  return (
    <Card padding="none">
      <h3 className="border-b border-[var(--border-default)] px-6 py-4 text-lg font-semibold text-[var(--text-primary)]">
        Splits par km
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-6 py-3">km</th>
              <th className="px-4 py-3">Allure</th>
              <th className="px-4 py-3">FC</th>
              <th className="px-4 py-3">Cadence</th>
              <th className="px-4 py-3">D+</th>
              <th className="px-4 py-3">GCT</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((split) => {
              const isFastest = split.averageSpeed === maxSpeed && speeds.length > 1;
              const isSlowest = split.averageSpeed === minSpeed && speeds.length > 1;

              return (
                <tr
                  key={`${split.splitType}-${split.splitNumber}`}
                  className={`border-b border-[var(--border-subtle)] ${
                    isFastest ? "bg-green-50" : isSlowest ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-6 py-2.5 font-medium text-[var(--text-primary)]">
                    {split.splitNumber}
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${
                    isFastest ? "text-green-700" : isSlowest ? "text-red-700" : "text-[var(--text-primary)]"
                  }`}>
                    {split.averageSpeed ? formatPace(split.averageSpeed) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {split.averageHR ?? "—"}
                    {split.maxHR ? <span className="text-[var(--text-muted)]"> / {split.maxHR}</span> : ""}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {split.averageCadence ? `${Math.round(split.averageCadence)} spm` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {split.elevationGain != null ? `${Math.round(split.elevationGain)}m` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {split.averageGCT ? `${Math.round(split.averageGCT)} ms` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
