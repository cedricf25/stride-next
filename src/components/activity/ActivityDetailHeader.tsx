import { Calendar, MapPin, Clock, Gauge, Heart, Mountain, Footprints, Zap, Battery, Flame } from "lucide-react";
import { formatDistance, formatDuration, formatPace, formatDate } from "@/lib/format";
import { StatItem, BackLink } from "@/components/shared";

interface Props {
  activity: {
    activityName: string;
    startTimeLocal: Date;
    distance: number;
    duration: number;
    averageSpeed: number | null;
    averageHR: number | null;
    maxHR: number | null;
    calories: number | null;
    elevationGain: number | null;
    elevationLoss: number | null;
    averageCadence: number | null;
    locationName: string | null;
    averagePower: number | null;
    maxPower: number | null;
    normalizedPower: number | null;
    staminaPercent: number | null;
    potentialStamina: number | null;
  };
}

export default function ActivityDetailHeader({ activity }: Props) {
  const stats = [
    { icon: <MapPin className="h-4 w-4 text-blue-500" />, label: "Distance", value: formatDistance(activity.distance) },
    { icon: <Clock className="h-4 w-4 text-green-500" />, label: "Durée", value: formatDuration(activity.duration) },
    { icon: <Gauge className="h-4 w-4 text-orange-500" />, label: "Allure", value: formatPace(activity.averageSpeed ?? 0) },
    { icon: <Heart className="h-4 w-4 text-red-500" />, label: "FC moy / max", value: activity.averageHR ? `${activity.averageHR} / ${activity.maxHR ?? "—"} bpm` : "—" },
    { icon: <Mountain className="h-4 w-4 text-emerald-500" />, label: "D+ / D−", value: `${Math.round(activity.elevationGain ?? 0)}m / ${Math.round(activity.elevationLoss ?? 0)}m` },
    { icon: <Footprints className="h-4 w-4 text-purple-500" />, label: "Cadence", value: activity.averageCadence ? `${Math.round(activity.averageCadence)} spm` : "—" },
    ...(activity.calories ? [{ icon: <Flame className="h-4 w-4 text-orange-600" />, label: "Calories", value: `${activity.calories} kcal` }] : []),
    ...(activity.averagePower ? [{ icon: <Zap className="h-4 w-4 text-yellow-500" />, label: "Puissance", value: `${Math.round(activity.averagePower)} W` }] : []),
    ...(activity.staminaPercent !== null ? [{ icon: <Battery className="h-4 w-4 text-cyan-500" />, label: "Stamina", value: `${Math.round(activity.staminaPercent)}%` }] : []),
  ];

  return (
    <div>
      <BackLink href="/" label="Retour" />

      <h1 className="text-xl font-bold text-[var(--text-primary)] md:text-2xl">{activity.activityName}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-tertiary)] md:gap-3">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatDate(activity.startTimeLocal.toISOString())}
        </span>
        {activity.locationName && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {activity.locationName}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:mt-6 md:gap-4 lg:grid-cols-6">
        {stats.map((s) => (
          <StatItem
            key={s.label}
            icon={s.icon}
            label={s.label}
            value={s.value}
            variant="card"
          />
        ))}
      </div>
    </div>
  );
}
