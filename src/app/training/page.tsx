import Link from "next/link";
import { Plus, Target, Calendar } from "lucide-react";
import { fetchTrainingPlans } from "@/actions/training";
import { fetchFatigueTrend } from "@/actions/health";
import FatigueTrendCard from "@/components/training/FatigueTrendCard";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Actif</span>;
    case "completed":
      return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Terminé</span>;
    default:
      return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Archivé</span>;
  }
}

export default async function TrainingPage() {
  const [plans, fatigue] = await Promise.all([
    fetchTrainingPlans(),
    fetchFatigueTrend(14),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Entraînement</h1>
        <Link
          href="/training/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau plan
        </Link>
      </div>

      {/* Fatigue */}
      <div className="mb-6">
        <FatigueTrendCard data={fatigue} />
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Target className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="text-gray-500">Aucun plan d&apos;entraînement</p>
          <p className="mt-1 text-sm text-gray-400">
            Créez votre premier plan pour préparer votre prochaine course
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const totalSessions = plan.weeks.reduce(
              (sum, w) => sum + w.sessions.length,
              0
            );
            const completedSessions = plan.weeks.reduce(
              (sum, w) =>
                sum + w.sessions.filter((s) => s.completed).length,
              0
            );

            return (
              <Link key={plan.id} href={`/training/${plan.id}`}>
                <div className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.name}
                        </h3>
                        {statusBadge(plan.status)}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
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
                      <p className="text-sm font-medium text-gray-900">
                        {completedSessions}/{totalSessions}
                      </p>
                      <p className="text-xs text-gray-500">séances</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{
                        width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
