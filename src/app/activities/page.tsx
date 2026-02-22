import { Activity } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import ActivityCard from "@/components/ActivityCard";
import LoadMoreActivities from "@/components/activities/LoadMoreActivities";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function ActivitiesPage() {
  const { activities } = await fetchGarminActivities(0, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900">
        <Activity className="h-7 w-7 text-blue-600" />
        Toutes les activités
      </h1>

      {activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Activity className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="text-gray-500">Aucune activité trouvée</p>
          <p className="mt-1 text-sm text-gray-400">
            Synchronise tes données Garmin depuis la sidebar
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
          {activities.length >= PAGE_SIZE && (
            <LoadMoreActivities initialPage={1} pageSize={PAGE_SIZE} />
          )}
        </>
      )}
    </div>
  );
}
