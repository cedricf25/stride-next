import { fetchHealthHistory } from "@/actions/health";
import WeightChart from "@/components/health/WeightChart";
import { PageContainer, BackLink, DataTable } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function WeightDetailPage() {
  const data = await fetchHealthHistory(90);

  const withWeight = data.filter((d) => d.weight != null);
  const weights = withWeight.map((d) => d.weight!);

  const avg = weights.length > 0 ? +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : null;
  const min = weights.length > 0 ? +Math.min(...weights).toFixed(1) : null;
  const max = weights.length > 0 ? +Math.max(...weights).toFixed(1) : null;
  const variation = weights.length >= 2 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : null;

  const stats = [
    { label: "Poids moyen", value: avg != null ? `${avg} kg` : "—" },
    { label: "Minimum", value: min != null ? `${min} kg` : "—" },
    { label: "Maximum", value: max != null ? `${max} kg` : "—" },
    {
      label: "Variation",
      value: variation != null ? `${variation > 0 ? "+" : ""}${variation} kg` : "—",
      color: variation != null ? (variation < 0 ? "text-green-600" : variation > 0 ? "text-orange-600" : "text-gray-900") : undefined,
    },
  ];

  type HealthRow = (typeof data)[number];

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "px-4 py-2 font-medium text-gray-900",
      render: (d: HealthRow) =>
        new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    {
      key: "weight",
      header: "Poids",
      render: (d: HealthRow) =>
        d.weight != null ? (
          <span className="font-medium text-blue-600">{d.weight.toFixed(1)} kg</span>
        ) : "—",
    },
    {
      key: "bmi",
      header: "IMC",
      render: (d: HealthRow) =>
        d.bmi != null ? d.bmi.toFixed(1) : "—",
    },
    {
      key: "fat",
      header: "Masse grasse",
      render: (d: HealthRow) =>
        d.bodyFatPercentage != null ? `${d.bodyFatPercentage.toFixed(1)}%` : "—",
    },
    {
      key: "muscle",
      header: "Masse musculaire",
      render: (d: HealthRow) =>
        d.muscleMass != null ? `${d.muscleMass.toFixed(1)} kg` : "—",
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Poids</h1>
      <p className="mb-6 text-sm text-gray-500">90 derniers jours — {withWeight.length} mesures</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold ${s.color ?? "text-gray-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <WeightChart data={data} />

      <DataTable
        columns={columns}
        data={[...data].reverse()}
        rowKey={(d) => d.calendarDate.toISOString()}
        className="mt-6"
      />
    </PageContainer>
  );
}
