import { fetchSleepHistory } from "@/actions/health";
import SleepChart from "@/components/health/SleepChart";
import { PageContainer, BackLink, DataTable } from "@/components/shared";

export const dynamic = "force-dynamic";

function formatSleepDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default async function SleepDetailPage() {
  const data = await fetchSleepHistory(90);

  const withSleep = data.filter((d) => d.totalSleepSeconds != null);
  const durations = withSleep.map((d) => d.totalSleepSeconds!);
  const scores = withSleep.map((d) => d.sleepScore).filter((s): s is number => s != null);

  const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const min = durations.length > 0 ? Math.min(...durations) : 0;
  const max = durations.length > 0 ? Math.max(...durations) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const stats = [
    { label: "Durée moyenne", value: formatSleepDuration(avg) },
    { label: "Minimum", value: formatSleepDuration(min) },
    { label: "Maximum", value: formatSleepDuration(max) },
    { label: "Score moyen", value: avgScore != null ? `${avgScore}/100` : "—" },
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
      key: "total",
      header: "Durée",
      render: (d: SleepRow) =>
        d.totalSleepSeconds != null ? formatSleepDuration(d.totalSleepSeconds) : "—",
    },
    {
      key: "deep",
      header: "Profond",
      className: "px-4 py-2 text-indigo-700",
      render: (d: SleepRow) =>
        d.deepSleepSeconds != null ? formatSleepDuration(d.deepSleepSeconds) : "—",
    },
    {
      key: "light",
      header: "Léger",
      className: "px-4 py-2 text-indigo-400",
      render: (d: SleepRow) =>
        d.lightSleepSeconds != null ? formatSleepDuration(d.lightSleepSeconds) : "—",
    },
    {
      key: "rem",
      header: "REM",
      className: "px-4 py-2 text-purple-400",
      render: (d: SleepRow) =>
        d.remSleepSeconds != null ? formatSleepDuration(d.remSleepSeconds) : "—",
    },
    {
      key: "awake",
      header: "Éveillé",
      className: "px-4 py-2 text-amber-500",
      render: (d: SleepRow) =>
        d.awakeSleepSeconds != null ? formatSleepDuration(d.awakeSleepSeconds) : "—",
    },
    {
      key: "score",
      header: "Score",
      render: (d: SleepRow) =>
        d.sleepScore != null ? (
          <span className={`font-medium ${d.sleepScore >= 80 ? "text-green-600" : d.sleepScore >= 60 ? "text-blue-600" : "text-orange-600"}`}>
            {d.sleepScore}
          </span>
        ) : "—",
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Sommeil</h1>
      <p className="mb-6 text-sm text-gray-500">90 derniers jours — {withSleep.length} nuits enregistrées</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <SleepChart data={data} />

      <DataTable
        columns={columns}
        data={[...data].reverse()}
        rowKey={(d) => d.calendarDate.toISOString()}
        className="mt-6"
      />
    </PageContainer>
  );
}
