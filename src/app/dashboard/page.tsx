import { Activity, AlertCircle } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import ActivityList from "@/components/ActivityList";
import AiAnalysis from "@/components/AiAnalysis";
import RefreshButton from "@/components/RefreshButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activities, rawActivities, error } = await fetchGarminActivities();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
          <Activity className="h-7 w-7 text-blue-600" />
          Stride Dashboard
        </h1>
        <RefreshButton />
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Activities */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Dernières courses
        </h2>
        <ActivityList activities={activities} />
      </section>

      {/* AI Analysis */}
      <AiAnalysis rawActivities={rawActivities} />
    </div>
  );
}
