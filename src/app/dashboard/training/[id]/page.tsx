import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchTrainingPlan, fetchPaceZones } from "@/actions/training";
import TrainingPlanHeader from "@/components/training/TrainingPlanHeader";
import TrainingWeekCard from "@/components/training/TrainingWeekCard";
import DeletePlanButton from "@/components/training/DeletePlanButton";
import UpdatePlanButton from "@/components/training/UpdatePlanButton";
import PaceZonesCard from "@/components/training/PaceZonesCard";

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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/dashboard/training"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux plans
      </Link>

      <TrainingPlanHeader plan={plan} />

      <div className="mt-4 space-y-3">
        <UpdatePlanButton planId={plan.id} />
        <div>
          <DeletePlanButton planId={plan.id} />
        </div>
      </div>

      {paceZones && (
        <div className="mt-4">
          <PaceZonesCard {...paceZones} />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {plan.weeks.map((week) => (
          <TrainingWeekCard key={week.id} week={week} planStartDate={plan.startDate} />
        ))}
      </div>
    </div>
  );
}
