import { fetchHealthHistory } from "@/actions/health";
import StepsChart from "@/components/health/StepsChart";
import { PageContainer, BackLink, DataTable, Badge } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function StepsDetailPage() {
  const data = await fetchHealthHistory(90);

  const withSteps = data.filter((d) => d.totalSteps != null);
  const values = withSteps.map((d) => d.totalSteps!);

  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;
  const daysOver10k = values.filter((v) => v >= 10000).length;

  const stats = [
    { label: "Moyenne/jour", value: avg != null ? avg.toLocaleString("fr-FR") : "—" },
    { label: "Minimum", value: min != null ? min.toLocaleString("fr-FR") : "—" },
    { label: "Maximum", value: max != null ? max.toLocaleString("fr-FR") : "—" },
    { label: "Jours 10 000+", value: `${daysOver10k}/${values.length}` },
  ];

  type HealthRow = (typeof data)[number];

  function goalBadgeColor(pct: number): "green" | "blue" | "gray" {
    if (pct >= 100) return "green";
    if (pct >= 70) return "blue";
    return "gray";
  }

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "px-4 py-2 font-medium text-gray-900",
      render: (d: HealthRow) =>
        new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    {
      key: "steps",
      header: "Pas",
      render: (d: HealthRow) => {
        const steps = d.totalSteps;
        return steps != null ? (
          <span className={`font-medium ${steps >= 10000 ? "text-green-600" : steps >= 7000 ? "text-blue-600" : "text-gray-600"}`}>
            {steps.toLocaleString("fr-FR")}
          </span>
        ) : "—";
      },
    },
    {
      key: "goal",
      header: "vs Objectif",
      render: (d: HealthRow) => {
        const steps = d.totalSteps;
        const pct = steps != null ? Math.round((steps / 10000) * 100) : null;
        return pct != null ? (
          <Badge color={goalBadgeColor(pct)}>{pct}%</Badge>
        ) : "—";
      },
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Pas quotidiens</h1>
      <p className="mb-6 text-sm text-gray-500">90 derniers jours — {withSteps.length} jours enregistrés</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <StepsChart data={data} />

      <DataTable
        columns={columns}
        data={[...data].reverse()}
        rowKey={(d) => d.calendarDate.toISOString()}
        className="mt-6"
      />
    </PageContainer>
  );
}
