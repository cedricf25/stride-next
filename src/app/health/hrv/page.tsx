import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchSleepHistory } from "@/actions/health";
import HrvChart from "@/components/health/HrvChart";

export const dynamic = "force-dynamic";

export default async function HrvDetailPage() {
  const data = await fetchSleepHistory(90);

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/health" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour à la santé
      </Link>

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

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">HRV</th>
              <th className="px-4 py-3 font-medium">FC repos nuit</th>
              <th className="px-4 py-3 font-medium">Stress sommeil</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.calendarDate.toISOString()} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">
                  {new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-2">
                  {d.avgOvernightHRV != null ? (
                    <span className="font-medium text-purple-600">{Math.round(d.avgOvernightHRV)} ms</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2">{d.restingHeartRate != null ? `${d.restingHeartRate} bpm` : "—"}</td>
                <td className="px-4 py-2">{d.avgSleepStress != null ? Math.round(d.avgSleepStress) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
