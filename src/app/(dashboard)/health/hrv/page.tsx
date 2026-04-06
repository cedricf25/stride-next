import { fetchSleepHistory } from "@/actions/health";
import { fetchHrvAnalysis } from "@/actions/gemini-health";
import HrvChart from "@/components/health/HrvChart";
import HrvAiAnalysis from "@/components/health/HrvAiAnalysis";
import { PageContainer, BackLink, DataTable } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function HrvDetailPage() {
  const [data, initialAnalysis] = await Promise.all([
    fetchSleepHistory(90),
    fetchHrvAnalysis(),
  ]);

  const withHrv = data.filter((d) => d.avgOvernightHRV != null);
  const values = withHrv.map((d) => d.avgOvernightHRV!);

  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const min = values.length > 0 ? Math.round(Math.min(...values)) : null;
  const max = values.length > 0 ? Math.round(Math.max(...values)) : null;

  // Tendance : 7 derniers jours vs 7 précédents
  const recent7 = values.slice(-7);
  const prev7 = values.slice(-14, -7);
  const avgRecent = recent7.length > 0 ? recent7.reduce((a, b) => a + b, 0) / recent7.length : 0;
  const avgPrev = prev7.length > 0 ? prev7.reduce((a, b) => a + b, 0) / prev7.length : 0;
  const diff = avgRecent - avgPrev;
  const trend = diff > 2 ? "En hausse" : diff < -2 ? "En baisse" : "Stable";
  const trendColor = diff > 2 ? "text-green-600" : diff < -2 ? "text-red-600" : "text-gray-600";

  const stats = [
    { label: "HRV moyenne", value: avg != null ? `${avg} ms` : "—" },
    { label: "Minimum", value: min != null ? `${min} ms` : "—" },
    { label: "Maximum", value: max != null ? `${max} ms` : "—" },
    { label: "Tendance 7j", value: trend, color: trendColor },
  ];

  type SleepRow = (typeof data)[number];

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "px-4 py-2 font-medium text-gray-900",
      render: (d: SleepRow) =>
        new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    {
      key: "hrv",
      header: "HRV",
      render: (d: SleepRow) =>
        d.avgOvernightHRV != null ? (
          <span className="font-medium text-purple-600">{Math.round(d.avgOvernightHRV)} ms</span>
        ) : "—",
    },
    {
      key: "hr",
      header: "FC repos nuit",
      render: (d: SleepRow) =>
        d.restingHeartRate != null ? `${d.restingHeartRate} bpm` : "—",
    },
    {
      key: "stress",
      header: "Stress sommeil",
      render: (d: SleepRow) =>
        d.avgSleepStress != null ? Math.round(d.avgSleepStress) : "—",
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">HRV nocturne</h1>
      <p className="mb-6 text-sm text-gray-500">90 derniers jours — {withHrv.length} mesures</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold ${"color" in s ? s.color : "text-gray-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <HrvChart data={data} />

      <DataTable
        columns={columns}
        data={[...data].reverse()}
        rowKey={(d) => d.calendarDate.toISOString()}
        className="mt-6"
      />

      <HrvAiAnalysis initialAnalysis={initialAnalysis} />
    </PageContainer>
  );
}
