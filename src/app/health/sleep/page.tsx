import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchSleepHistory } from "@/actions/health";
import SleepChart from "@/components/health/SleepChart";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/health" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour à la santé
      </Link>

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

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Durée</th>
              <th className="px-4 py-3 font-medium">Profond</th>
              <th className="px-4 py-3 font-medium">Léger</th>
              <th className="px-4 py-3 font-medium">REM</th>
              <th className="px-4 py-3 font-medium">Éveillé</th>
              <th className="px-4 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.calendarDate.toISOString()} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">
                  {new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-2">{d.totalSleepSeconds != null ? formatSleepDuration(d.totalSleepSeconds) : "—"}</td>
                <td className="px-4 py-2 text-indigo-700">{d.deepSleepSeconds != null ? formatSleepDuration(d.deepSleepSeconds) : "—"}</td>
                <td className="px-4 py-2 text-indigo-400">{d.lightSleepSeconds != null ? formatSleepDuration(d.lightSleepSeconds) : "—"}</td>
                <td className="px-4 py-2 text-purple-400">{d.remSleepSeconds != null ? formatSleepDuration(d.remSleepSeconds) : "—"}</td>
                <td className="px-4 py-2 text-amber-500">{d.awakeSleepSeconds != null ? formatSleepDuration(d.awakeSleepSeconds) : "—"}</td>
                <td className="px-4 py-2">
                  {d.sleepScore != null ? (
                    <span className={`font-medium ${d.sleepScore >= 80 ? "text-green-600" : d.sleepScore >= 60 ? "text-blue-600" : "text-orange-600"}`}>
                      {d.sleepScore}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
