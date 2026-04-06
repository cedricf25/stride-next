import { notFound } from "next/navigation";
import { fetchTrainingPlan } from "@/actions/training";
import { fetchPlanVersions } from "@/actions/training-versions";
import { BackLink } from "@/components/shared";
import { VersionCompareClient } from "@/components/training/versioning";

export const dynamic = "force-dynamic";

export default async function PlanVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, versions] = await Promise.all([
    fetchTrainingPlan(id),
    fetchPlanVersions(id),
  ]);

  if (!plan) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      <BackLink href={`/training/${id}`} label="Retour au plan" />

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Historique des versions
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        {plan.name}
      </p>

      <VersionCompareClient
        planId={id}
        versions={versions}
        currentVersion={plan.currentVersion}
      />
    </div>
  );
}
