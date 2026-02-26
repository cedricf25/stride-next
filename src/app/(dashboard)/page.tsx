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
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>

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
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
          Dernières courses
        </h2>
        <ActivityList activities={activities} />
      </section>

      {/* AI Coaching */}
      <AiAnalysis />
    </PageContainer>
  );
}
