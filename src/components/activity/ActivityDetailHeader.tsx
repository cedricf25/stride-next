import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, Gauge, Heart, Mountain, Footprints } from "lucide-react";
import { formatDistance, formatDuration, formatPace, formatDate } from "@/lib/format";
import StatItem from "@/components/shared/StatItem";

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
  ];

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{activity.activityName}</h1>
      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
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
        {activity.calories && (
          <span>{activity.calories} kcal</span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
