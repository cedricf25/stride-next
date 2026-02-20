import ActivityCard from "./ActivityCard";
import type { FormattedActivity } from "@/types/garmin";

interface ActivityListProps {
  activities: FormattedActivity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Aucune activité trouvée.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
