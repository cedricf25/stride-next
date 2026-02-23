import { notFound } from "next/navigation";
import { fetchTrainingPlan, fetchPaceZones } from "@/actions/training";
import TrainingPlanHeader from "@/components/training/TrainingPlanHeader";
import TrainingWeekCard from "@/components/training/TrainingWeekCard";
import DeletePlanButton from "@/components/training/DeletePlanButton";
import UpdatePlanButton from "@/components/training/UpdatePlanButton";
import PaceZonesCard from "@/components/training/PaceZonesCard";
import PlanProgressWidget from "@/components/training/PlanProgressWidget";
import { PageContainer, BackLink } from "@/components/shared";

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

      <div className="mt-4 space-y-3">
        <UpdatePlanButton
          planId={plan.id}
          currentStartDate={plan.startDate?.toISOString().split("T")[0]}
        />
        <div>
          <DeletePlanButton planId={plan.id} />
        </div>
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
            planStartDate={plan.startDate}
            planningMode={((plan as { planningMode?: string }).planningMode as "time" | "distance") || "time"}
          />
        ))}
      </div>
    </PageContainer>
  );
}
