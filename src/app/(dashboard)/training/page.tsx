import { Plus, Target, Calendar } from "lucide-react";
import { fetchTrainingPlans, fetchNextSession } from "@/actions/training";
import { fetchFatigueTrend } from "@/actions/health";
import FatigueTrendCard from "@/components/training/FatigueTrendCard";
import NextSessionCard from "@/components/training/NextSessionCard";
import {
  PageContainer,
  LinkButton,
  EmptyState,
  Badge,
  ProgressBar,
} from "@/components/shared";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  const map: Record<string, { color: "green" | "blue" | "gray"; label: string }> = {
    active: { color: "green", label: "Actif" },
    completed: { color: "blue", label: "Terminé" },
  };
  const { color, label } = map[status] ?? { color: "gray" as const, label: "Archivé" };
  return <Badge color={color}>{label}</Badge>;
}

export default async function TrainingPage() {
  const [plans, fatigue, nextSession] = await Promise.all([
    fetchTrainingPlans(),
    fetchFatigueTrend(14),
    fetchNextSession(),
  ]);

  return (
    <PageContainer>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)] md:text-2xl">Entraînement</h1>
        <LinkButton
          href="/training/new"
          icon={<Plus className="h-4 w-4" />}
        >
          Nouveau plan
        </LinkButton>
      </div>

      {/* Prochaine séance */}
      {nextSession && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
            Prochaine séance
          </h2>
          <NextSessionCard data={nextSession} />
        </div>
      )}

      {/* Fatigue */}
      <div className="mb-6">
        <FatigueTrendCard data={fatigue} />
      </div>

      {plans.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={<Target className="h-10 w-10" />}
          message="Aucun plan d&apos;entraînement"
          subtitle="Créez votre premier plan pour préparer votre prochaine course"
        />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const totalSessions = plan.weeks.reduce(
              (sum, w) => sum + w.sessions.filter((s) => s.sessionType !== "rest").length,
              0
            );
            const completedSessions = plan.weeks.reduce(
              (sum, w) =>
                sum + w.sessions.filter((s) => s.completed && !s.missed && s.sessionType !== "rest").length,
              0
            );

            return (
              <a key={plan.id} href={`/training/${plan.id}`}>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 transition-shadow hover:shadow-md md:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] md:text-lg">
                          {plan.name}
                        </h3>
                        {statusBadge(plan.status)}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
                        <span className="capitalize">{plan.raceType}</span>
                        {plan.raceDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(plan.raceDate).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                        <span>{plan.weeks.length} semaines</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {completedSessions}/{totalSessions}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">séances</p>
                    </div>
                  </div>

                  <ProgressBar
                    value={totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}
                    className="mt-3"
                  />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
