import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { fetchTrainingPlan, fetchPaceZones } from "@/actions/training";
import TrainingPlanHeader from "@/components/training/TrainingPlanHeader";
import TrainingWeekCard from "@/components/training/TrainingWeekCard";
import DeletePlanButton from "@/components/training/DeletePlanButton";
import UpdatePlanButton from "@/components/training/UpdatePlanButton";
import PaceZonesCard from "@/components/training/PaceZonesCard";
import PlanProgressWidget from "@/components/training/PlanProgressWidget";
import { PageContainer, BackLink, LinkButton } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function TrainingPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, paceZones] = await Promise.all([
    fetchTrainingPlan(id),
    fetchPaceZones(),
  ]);

  if (!plan) {
    notFound();
  }

  return (
    <PageContainer>
      <BackLink href="/training" label="Retour aux plans" />

      <TrainingPlanHeader plan={plan} />

      <div className="mt-4 flex items-center gap-3">
        <UpdatePlanButton
          planId={plan.id}
          currentStartDate={plan.startDate?.toISOString().split("T")[0]}
        />
        <DeletePlanButton planId={plan.id} />
        {plan.currentVersion > 1 && (
          <LinkButton
            href={`/training/${plan.id}/versions`}
            variant="ghost"
            size="sm"
            icon={<History className="h-4 w-4" />}
          >
            Historique ({plan.currentVersion} versions)
          </LinkButton>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PlanProgressWidget weeks={plan.weeks} />
        {paceZones && <PaceZonesCard {...paceZones} />}
      </div>

      <div className="mt-8 space-y-4">
        {plan.weeks.map((week) => (
          <TrainingWeekCard
            key={week.id}
            week={week}
            planId={plan.id}
            planStartDate={plan.startDate}
            planningMode={((plan as { planningMode?: string }).planningMode as "time" | "distance") || "time"}
          />
        ))}
      </div>
    </PageContainer>
  );
}
