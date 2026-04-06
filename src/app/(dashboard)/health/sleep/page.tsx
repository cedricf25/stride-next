import { fetchSleepHistory } from "@/actions/health";
import { fetchSleepAnalysis } from "@/actions/gemini-health";
import SleepChart from "@/components/health/SleepChart";
import SleepAiAnalysis from "@/components/health/SleepAiAnalysis";
import { PageContainer, BackLink, DataTable } from "@/components/shared";

export const dynamic = "force-dynamic";

function formatSleepDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default async function SleepDetailPage() {
  const [data, initialAnalysis] = await Promise.all([
    fetchSleepHistory(90),
    fetchSleepAnalysis(),
  ]);

  const withSleep = data.filter((d) => d.totalSleepSeconds != null);
  const durations = withSleep.map((d) => d.totalSleepSeconds!);
  const scores = withSleep.map((d) => d.sleepScore).filter((s): s is number => s != null);

  const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const min = durations.length > 0 ? Math.min(...durations) : 0;
  const max = durations.length > 0 ? Math.max(...durations) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Calculate average bedtime and wake time
  // Garmin timestamps are "local" encoded as UTC, so use UTC methods
  const bedtimes: number[] = [];
  const waketimes: number[] = [];
  for (const s of withSleep) {
    if (s.sleepStartTimestamp) {
      const d = new Date(s.sleepStartTimestamp);
      let hours = d.getUTCHours() + d.getUTCMinutes() / 60;
      if (hours < 12) hours += 24;
      bedtimes.push(hours);
    }
    if (s.sleepEndTimestamp) {
      const d = new Date(s.sleepEndTimestamp);
      waketimes.push(d.getUTCHours() + d.getUTCMinutes() / 60);
    }
  }

  const formatTimeFromHours = (h: number): string => {
    const normalizedH = h >= 24 ? h - 24 : h;
    const hours = Math.floor(normalizedH);
    const mins = Math.round((normalizedH - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const avgBedtime = bedtimes.length > 0 ? bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length : null;
  const avgWaketime = waketimes.length > 0 ? waketimes.reduce((a, b) => a + b, 0) / waketimes.length : null;

  const stats = [
    { label: "Durée moyenne", value: formatSleepDuration(avg) },
    { label: "Score moyen", value: avgScore != null ? `${avgScore}/100` : "—" },
    { label: "Coucher moyen", value: avgBedtime != null ? formatTimeFromHours(avgBedtime) : "—" },
    { label: "Réveil moyen", value: avgWaketime != null ? formatTimeFromHours(avgWaketime) : "—" },
  ];

  type SleepRow = (typeof data)[number];

  // Garmin timestamps are "local" encoded as UTC
  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    const d = new Date(date);
    const hours = d.getUTCHours().toString().padStart(2, "0");
    const mins = d.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "px-4 py-2 font-medium text-gray-900",
      render: (d: SleepRow) =>
        new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    {
      key: "bedtime",
      header: "Coucher",
      className: "px-4 py-2 text-gray-600",
      render: (d: SleepRow) => formatTime(d.sleepStartTimestamp),
    },
    {
      key: "waketime",
      header: "Réveil",
      className: "px-4 py-2 text-gray-600",
      render: (d: SleepRow) => formatTime(d.sleepEndTimestamp),
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
      key: "rem",
      header: "REM",
      className: "px-4 py-2 text-purple-400",
      render: (d: SleepRow) =>
        d.remSleepSeconds != null ? formatSleepDuration(d.remSleepSeconds) : "—",
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

      <SleepAiAnalysis initialAnalysis={initialAnalysis} />
    </PageContainer>
  );
}
