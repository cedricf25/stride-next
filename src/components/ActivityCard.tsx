import Link from "next/link";
import { Calendar, MapPin, Clock, Gauge, Heart, Zap } from "lucide-react";
import type { FormattedActivity } from "@/types/garmin";
import StatItem from "@/components/shared/StatItem";
import ProgressBar from "@/components/shared/ProgressBar";

interface ActivityCardProps {
  activity: FormattedActivity;
}

function teColor(value: number): string {
  if (value < 2) return "bg-gray-300";
  if (value < 3) return "bg-blue-400";
  if (value < 4) return "bg-green-500";
  if (value < 5) return "bg-orange-500";
  return "bg-red-500";
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <Link href={`/activities/${activity.id}`}>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm transition-shadow hover:shadow-md">
        <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
          {activity.name}
        </h3>
        <div className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-tertiary)]">
          <Calendar className="h-4 w-4" />
          <span>{activity.date}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatItem icon={<MapPin className="h-4 w-4 text-blue-500" />} label="Distance" value={activity.distance} />
          <StatItem icon={<Clock className="h-4 w-4 text-green-500" />} label="Durée" value={activity.duration} />
          <StatItem icon={<Gauge className="h-4 w-4 text-orange-500" />} label="Allure" value={activity.pace} />
          <StatItem icon={<Heart className="h-4 w-4 text-red-500" />} label="FC moy." value={activity.averageHR ? `${activity.averageHR} bpm` : "N/A"} />
        </div>

        {/* Training Effect bar */}
        {activity.aerobicTE != null && activity.aerobicTE > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Training Effect</span>
                <span className="font-medium text-[var(--text-secondary)]">{activity.aerobicTE.toFixed(1)}</span>
              </div>
              <ProgressBar
                value={Math.min((activity.aerobicTE / 5) * 100, 100)}
                color={teColor(activity.aerobicTE)}
                className="mt-0.5"
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
