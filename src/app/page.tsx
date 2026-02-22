import { AlertCircle } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import ActivityList from "@/components/ActivityList";
import AiAnalysis from "@/components/AiAnalysis";
import HealthSummaryWidgets from "@/components/health/HealthSummaryWidgets";
import { PageContainer, AlertBanner } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activities, error } = await fetchGarminActivities();

  return (
    <PageContainer>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      {error && (
        <AlertBanner
          variant="error"
          icon={<AlertCircle className="h-5 w-5" />}
          className="mb-6"
        >
          <p>{error}</p>
        </AlertBanner>
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
    </PageContainer>
  );
}
