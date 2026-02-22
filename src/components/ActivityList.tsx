import ActivityCard from "./ActivityCard";
import EmptyState from "@/components/shared/EmptyState";
import type { FormattedActivity } from "@/types/garmin";

interface ActivityListProps {
  activities: FormattedActivity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <EmptyState variant="dashed" message="Aucune activité trouvée." />
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
