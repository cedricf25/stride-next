import { Battery } from "lucide-react";
import Card from "@/components/shared/Card";
import EmptyState from "@/components/shared/EmptyState";
import SectionHeader from "@/components/shared/SectionHeader";

interface SleepData {
  startBodyBattery: number | null;
  endBodyBattery: number | null;
  bodyBatteryChange: number | null;
  calendarDate: Date;
}

interface Props {
  data: SleepData | null;
}

function batteryColor(value: number): string {
  if (value >= 75) return "bg-green-500";
  if (value >= 50) return "bg-blue-500";
  if (value >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export default function BodyBatteryCard({ data }: Props) {
  if (!data || data.endBodyBattery == null) {
    return (
      <EmptyState
        title="Body Battery"
        message="Aucune donnée"
      />
    );
  }

  const change = data.bodyBatteryChange ?? (data.endBodyBattery - (data.startBodyBattery ?? 0));
  const isPositive = change >= 0;

  return (
    <Card>
      <SectionHeader
        icon={<Battery className="h-5 w-5 text-green-500" />}
        title="Body Battery"
        className="mb-4"
      />

      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-default)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={data.endBodyBattery >= 75 ? "#22c55e" : data.endBodyBattery >= 50 ? "#3b82f6" : data.endBodyBattery >= 25 ? "#f97316" : "#ef4444"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(data.endBodyBattery / 100) * 251.3} 251.3`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{data.endBodyBattery}</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {data.startBodyBattery != null && (
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Début de nuit</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded-full bg-[var(--bg-muted)]">
                  <div
                    className={`h-2 rounded-full ${batteryColor(data.startBodyBattery)}`}
                    style={{ width: `${data.startBodyBattery}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{data.startBodyBattery}</span>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Variation nocturne</p>
            <p className={`text-lg font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : ""}{change}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
