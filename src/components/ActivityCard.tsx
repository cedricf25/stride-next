import { Calendar, MapPin, Clock, Gauge, Heart } from "lucide-react";
import type { FormattedActivity } from "@/types/garmin";

interface ActivityCardProps {
  activity: FormattedActivity;
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        {activity.name}
      </h3>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Calendar className="h-4 w-4" />
        <span>{activity.date}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<MapPin className="h-4 w-4 text-blue-500" />} label="Distance" value={activity.distance} />
        <Stat icon={<Clock className="h-4 w-4 text-green-500" />} label="Durée" value={activity.duration} />
        <Stat icon={<Gauge className="h-4 w-4 text-orange-500" />} label="Allure" value={activity.pace} />
        <Stat icon={<Heart className="h-4 w-4 text-red-500" />} label="FC moy." value={activity.averageHR ? `${activity.averageHR} bpm` : "N/A"} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
