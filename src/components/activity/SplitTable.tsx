import { formatPace } from "@/lib/format";
import Card from "@/components/shared/Card";

interface Split {
  splitNumber: number;
  splitType: string;
  distance: number;
  duration: number;
  averageSpeed: number | null;
  maxSpeed: number | null;
  averageHR: number | null;
  maxHR: number | null;
  averageCadence: number | null;
  elevationGain: number | null;
  averageGCT: number | null;
  averageStrideLength: number | null;
  averageVerticalOscillation: number | null;
  averagePower: number | null;
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
      <h3 className="border-b border-[var(--border-default)] px-4 py-3 text-base font-semibold text-[var(--text-primary)] md:px-6 md:py-4 md:text-lg">
        Splits par km
      </h3>

      {/* Mobile: Card layout */}
      <div className="space-y-2 p-3 md:hidden">
        {splits.map((split) => {
          const isFastest = split.averageSpeed === maxSpeed && speeds.length > 1;
          const isSlowest = split.averageSpeed === minSpeed && speeds.length > 1;

          return (
            <div
              key={`${split.splitType}-${split.splitNumber}`}
              className={`rounded-lg p-3 ${
                isFastest ? "bg-green-50" : isSlowest ? "bg-red-50" : "bg-[var(--bg-muted)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text-primary)]">
                  Km {split.splitNumber}
                </span>
                <span className={`text-lg font-bold ${
                  isFastest ? "text-green-700" : isSlowest ? "text-red-700" : "text-[var(--text-primary)]"
                }`}>
                  {split.averageSpeed ? formatPace(split.averageSpeed) : "—"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-[var(--text-secondary)]">
                <div>
                  <span className="text-[var(--text-muted)]">FC</span>
                  <span className="ml-1">{split.averageHR ?? "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Cad</span>
                  <span className="ml-1">{split.averageCadence ? Math.round(split.averageCadence) : "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">D+</span>
                  <span className="ml-1">{split.elevationGain != null ? `${Math.round(split.elevationGain)}m` : "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">GCT</span>
                  <span className="ml-1">{split.averageGCT ? `${Math.round(split.averageGCT)}` : "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-6 py-3">km</th>
              <th className="px-4 py-3">Allure</th>
              <th className="px-4 py-3">FC</th>
              <th className="px-4 py-3">Cadence</th>
              <th className="px-4 py-3">Foulée</th>
              <th className="px-4 py-3">GCT</th>
              <th className="px-4 py-3">D+</th>
              {splits.some(s => s.averagePower) && <th className="px-4 py-3">Power</th>}
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
                    {split.averageStrideLength ? `${(split.averageStrideLength / 100).toFixed(2)}m` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {split.averageGCT ? `${Math.round(split.averageGCT)} ms` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {split.elevationGain != null ? `${Math.round(split.elevationGain)}m` : "—"}
                  </td>
                  {splits.some(s => s.averagePower) && (
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                      {split.averagePower ? `${Math.round(split.averagePower)}W` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
