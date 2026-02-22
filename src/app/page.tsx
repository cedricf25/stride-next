import { AlertCircle } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import ActivityList from "@/components/ActivityList";
import AiAnalysis from "@/components/AiAnalysis";
import HealthSummaryWidgets from "@/components/health/HealthSummaryWidgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activities, error } = await fetchGarminActivities();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Health Summary */}
      <HealthSummaryWidgets />

      {/* Activities */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Dernières courses
        </h2>
        <ActivityList activities={activities} />
      </section>

      {/* AI Coaching */}
      <AiAnalysis />
    </div>
  );
}
