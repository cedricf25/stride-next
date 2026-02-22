import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchHealthHistory } from "@/actions/health";
import StepsChart from "@/components/health/StepsChart";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/health" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour à la santé
      </Link>

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

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Pas</th>
              <th className="px-4 py-3 font-medium">vs Objectif</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => {
              const steps = d.totalSteps;
              const pct = steps != null ? Math.round((steps / 10000) * 100) : null;
              return (
                <tr key={d.calendarDate.toISOString()} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-2">
                    {steps != null ? (
                      <span className={`font-medium ${steps >= 10000 ? "text-green-600" : steps >= 7000 ? "text-blue-600" : "text-gray-600"}`}>
                        {steps.toLocaleString("fr-FR")}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {pct != null ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        pct >= 100 ? "bg-green-100 text-green-700" : pct >= 70 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {pct}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
