import { fetchSleepHistory, fetchHealthHistory } from "@/actions/health";
import { fetchStressAnalysis } from "@/actions/gemini-health";
import StressChart from "@/components/health/StressChart";
import DailyStressChart from "@/components/health/DailyStressChart";
import StressAiAnalysis from "@/components/health/StressAiAnalysis";
import { PageContainer, BackLink, DataTable, SectionHeader } from "@/components/shared";
import { Moon, Sun } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StressDetailPage() {
  const [sleepData, healthData, initialAnalysis] = await Promise.all([
    fetchSleepHistory(90),
    fetchHealthHistory(90),
    fetchStressAnalysis(),
  ]);

  // Sleep stress stats
  const withSleepStress = sleepData.filter((d) => d.avgSleepStress != null);
  const sleepStressValues = withSleepStress.map((d) => d.avgSleepStress!);
  const sleepAvg = sleepStressValues.length > 0
    ? Math.round(sleepStressValues.reduce((a, b) => a + b, 0) / sleepStressValues.length)
    : null;

  // Daily stress stats
  const withDailyStress = healthData.filter((d) => d.stressLevel != null);
  const dailyStressValues = withDailyStress.map((d) => d.stressLevel!);
  const dailyAvg = dailyStressValues.length > 0
    ? Math.round(dailyStressValues.reduce((a, b) => a + b, 0) / dailyStressValues.length)
    : null;

  // Tendance stress quotidien
  const recent7Daily = dailyStressValues.slice(-7);
  const prev7Daily = dailyStressValues.slice(-14, -7);
  const avgRecentDaily = recent7Daily.length > 0 ? recent7Daily.reduce((a, b) => a + b, 0) / recent7Daily.length : 0;
  const avgPrevDaily = prev7Daily.length > 0 ? prev7Daily.reduce((a, b) => a + b, 0) / prev7Daily.length : 0;
  const diffDaily = avgRecentDaily - avgPrevDaily;
  const trendDaily = diffDaily < -3 ? "En baisse" : diffDaily > 3 ? "En hausse" : "Stable";
  const trendDailyColor = diffDaily < -3 ? "text-green-600" : diffDaily > 3 ? "text-red-600" : "text-gray-600";

  // Tendance stress nocturne
  const recent7Sleep = sleepStressValues.slice(-7);
  const prev7Sleep = sleepStressValues.slice(-14, -7);
  const avgRecentSleep = recent7Sleep.length > 0 ? recent7Sleep.reduce((a, b) => a + b, 0) / recent7Sleep.length : 0;
  const avgPrevSleep = prev7Sleep.length > 0 ? prev7Sleep.reduce((a, b) => a + b, 0) / prev7Sleep.length : 0;
  const diffSleep = avgRecentSleep - avgPrevSleep;
  const trendSleep = diffSleep < -3 ? "En baisse" : diffSleep > 3 ? "En hausse" : "Stable";
  const trendSleepColor = diffSleep < -3 ? "text-green-600" : diffSleep > 3 ? "text-red-600" : "text-gray-600";

  const getStressLevel = (value: number) => {
    if (value <= 25) return { label: "Bas", color: "text-green-600" };
    if (value <= 50) return { label: "Modéré", color: "text-yellow-600" };
    if (value <= 75) return { label: "Élevé", color: "text-orange-600" };
    return { label: "Très élevé", color: "text-red-600" };
  };

  const dailyLevel = dailyAvg != null ? getStressLevel(dailyAvg) : null;
  const sleepLevel = sleepAvg != null ? getStressLevel(sleepAvg) : null;

  // Merge data for table (by date)
  const dateMap = new Map<string, {
    date: Date;
    dailyStress: number | null;
    sleepStress: number | null;
    sleepScore: number | null;
    hrv: number | null;
  }>();

  for (const h of healthData) {
    const key = h.calendarDate.toISOString().split("T")[0];
    dateMap.set(key, {
      date: h.calendarDate,
      dailyStress: h.stressLevel,
      sleepStress: null,
      sleepScore: null,
      hrv: null,
    });
  }

  for (const s of sleepData) {
    const key = s.calendarDate.toISOString().split("T")[0];
    const existing = dateMap.get(key);
    if (existing) {
      existing.sleepStress = s.avgSleepStress;
      existing.sleepScore = s.sleepScore;
      existing.hrv = s.avgOvernightHRV;
    } else {
      dateMap.set(key, {
        date: s.calendarDate,
        dailyStress: null,
        sleepStress: s.avgSleepStress,
        sleepScore: s.sleepScore,
        hrv: s.avgOvernightHRV,
      });
    }
  }

  const combinedData = Array.from(dateMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  type CombinedRow = (typeof combinedData)[number];

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "px-4 py-2 font-medium text-gray-900",
      render: (d: CombinedRow) =>
        new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    {
      key: "day",
      header: "Jour",
      render: (d: CombinedRow) =>
        new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short" }),
    },
    {
      key: "dailyStress",
      header: "Stress jour",
      render: (d: CombinedRow) => {
        if (d.dailyStress == null) return "—";
        const level = getStressLevel(d.dailyStress);
        return (
          <span className={`font-medium ${level.color}`}>
            {d.dailyStress}
          </span>
        );
      },
    },
    {
      key: "sleepStress",
      header: "Stress nuit",
      render: (d: CombinedRow) => {
        if (d.sleepStress == null) return "—";
        const level = getStressLevel(d.sleepStress);
        return (
          <span className={`font-medium ${level.color}`}>
            {Math.round(d.sleepStress)}
          </span>
        );
      },
    },
    {
      key: "sleep",
      header: "Score sommeil",
      render: (d: CombinedRow) =>
        d.sleepScore != null ? `${d.sleepScore}/100` : "—",
    },
    {
      key: "hrv",
      header: "HRV",
      render: (d: CombinedRow) =>
        d.hrv != null ? (
          <span className="text-purple-600">{Math.round(d.hrv)} ms</span>
        ) : "—",
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Stress</h1>
      <p className="mb-6 text-sm text-gray-500">
        90 derniers jours — {withDailyStress.length} mesures jour / {withSleepStress.length} mesures nuit
      </p>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
            <Sun className="h-3 w-3" />
            <span>Stress quotidien</span>
          </div>
          <p className={`text-lg font-semibold ${dailyLevel?.color ?? "text-gray-900"}`}>
            {dailyAvg ?? "—"} <span className="text-sm font-normal">{dailyLevel?.label ?? ""}</span>
          </p>
          <p className={`text-xs ${trendDailyColor}`}>Tendance 7j : {trendDaily}</p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-orange-600 mb-1">
            <Moon className="h-3 w-3" />
            <span>Stress nocturne</span>
          </div>
          <p className={`text-lg font-semibold ${sleepLevel?.color ?? "text-gray-900"}`}>
            {sleepAvg ?? "—"} <span className="text-sm font-normal">{sleepLevel?.label ?? ""}</span>
          </p>
          <p className={`text-xs ${trendSleepColor}`}>Tendance 7j : {trendSleep}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Min / Max jour</p>
          <p className="text-lg font-semibold text-gray-900">
            {dailyStressValues.length > 0 ? Math.min(...dailyStressValues) : "—"} / {dailyStressValues.length > 0 ? Math.max(...dailyStressValues) : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Min / Max nuit</p>
          <p className="text-lg font-semibold text-gray-900">
            {sleepStressValues.length > 0 ? Math.round(Math.min(...sleepStressValues)) : "—"} / {sleepStressValues.length > 0 ? Math.round(Math.max(...sleepStressValues)) : "—"}
          </p>
        </div>
      </div>

      {/* Daily stress chart */}
      <div className="mb-6">
        <SectionHeader
          icon={<Sun className="h-5 w-5 text-blue-500" />}
          title="Stress quotidien"
          className="mb-3"
        />
        <DailyStressChart data={healthData} />
      </div>

      {/* Sleep stress chart */}
      <div className="mb-6">
        <SectionHeader
          icon={<Moon className="h-5 w-5 text-orange-500" />}
          title="Stress nocturne"
          className="mb-3"
        />
        <StressChart data={sleepData} />
      </div>

      <DataTable
        columns={columns}
        data={combinedData}
        rowKey={(d) => d.date.toISOString()}
        className="mt-6"
      />

      <StressAiAnalysis initialAnalysis={initialAnalysis} />
    </PageContainer>
  );
}
