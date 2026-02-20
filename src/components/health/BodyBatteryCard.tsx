import { Battery } from "lucide-react";

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
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Battery className="h-5 w-5 text-green-500" />
          Body Battery
        </h3>
        <p className="text-sm text-gray-500">Aucune donnée</p>
      </div>
    );
  }

  const change = data.bodyBatteryChange ?? (data.endBodyBattery - (data.startBodyBattery ?? 0));
  const isPositive = change >= 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Battery className="h-5 w-5 text-green-500" />
        Body Battery
      </h3>

      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
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
            <span className="text-2xl font-bold text-gray-900">{data.endBodyBattery}</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {data.startBodyBattery != null && (
            <div>
              <p className="text-xs text-gray-500">Début de nuit</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${batteryColor(data.startBodyBattery)}`}
                    style={{ width: `${data.startBodyBattery}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{data.startBodyBattery}</span>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Variation nocturne</p>
            <p className={`text-lg font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : ""}{change}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
