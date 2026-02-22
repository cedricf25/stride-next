import { fetchHealthHistory } from "@/actions/health";
import RestingHRChart from "@/components/health/RestingHRChart";
import { PageContainer, BackLink, DataTable } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function HeartRateDetailPage() {
  const data = await fetchHealthHistory(90);

  const withHR = data.filter((d) => d.restingHeartRate != null);
  const values = withHR.map((d) => d.restingHeartRate!);

  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;

  // Tendance 7j
  const recent7 = values.slice(-7);
  const prev7 = values.slice(-14, -7);
  const avgRecent = recent7.length > 0 ? recent7.reduce((a, b) => a + b, 0) / recent7.length : 0;
  const avgPrev = prev7.length > 0 ? prev7.reduce((a, b) => a + b, 0) / prev7.length : 0;
  const diff = avgRecent - avgPrev;
  const trend = diff < -1 ? "En baisse" : diff > 1 ? "En hausse" : "Stable";
  const trendColor = diff < -1 ? "text-green-600" : diff > 1 ? "text-red-600" : "text-gray-600";

  const stats = [
    { label: "FC moyenne", value: avg != null ? `${avg} bpm` : "—" },
    { label: "Minimum", value: min != null ? `${min} bpm` : "—" },
    { label: "Maximum", value: max != null ? `${max} bpm` : "—" },
    { label: "Tendance 7j", value: trend, color: trendColor },
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
      key: "resting",
      header: "FC repos",
      render: (d: HealthRow) =>
        d.restingHeartRate != null ? (
          <span className="font-medium text-red-500">{d.restingHeartRate} bpm</span>
        ) : "—",
    },
    {
      key: "max",
      header: "FC max",
      render: (d: HealthRow) =>
        d.maxHeartRate != null ? `${d.maxHeartRate} bpm` : "—",
    },
    {
      key: "min",
      header: "FC min",
      render: (d: HealthRow) =>
        d.minHeartRate != null ? `${d.minHeartRate} bpm` : "—",
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Fréquence cardiaque au repos</h1>
      <p className="mb-6 text-sm text-gray-500">90 derniers jours — {withHR.length} mesures</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold ${"color" in s ? s.color : "text-gray-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <RestingHRChart data={data} />

      <DataTable
        columns={columns}
        data={[...data].reverse()}
        rowKey={(d) => d.calendarDate.toISOString()}
        className="mt-6"
      />
    </PageContainer>
  );
}
