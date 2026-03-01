import { AlertCircle } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import ActivityList from "@/components/ActivityList";
import AiAnalysis from "@/components/AiAnalysis";
import HealthSummaryWidgets from "@/components/health/HealthSummaryWidgets";
import TrainingIntensityCard from "@/components/health/TrainingIntensityCard";
import { PageContainer, AlertBanner } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activities, error } = await fetchGarminActivities(0, 6);

  return (
    <PageContainer>
      <h1 className="mb-4 text-xl font-bold text-[var(--text-primary)] md:mb-6 md:text-2xl">Dashboard</h1>

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

      {/* Training Intensity */}
      <section className="mt-6">
        <TrainingIntensityCard />
      </section>

      {/* Activities */}
      <section className="mt-6 md:mt-8">
        <h2 className="mb-3 text-lg font-bold text-[var(--text-primary)] md:mb-4 md:text-xl">
          Dernières courses
        </h2>
        <ActivityList activities={activities} />
      </section>

      {/* AI Coaching */}
      <AiAnalysis />
    </PageContainer>
  );
}
