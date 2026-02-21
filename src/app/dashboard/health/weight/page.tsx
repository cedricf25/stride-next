import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchHealthHistory } from "@/actions/health";
import WeightChart from "@/components/health/WeightChart";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/dashboard/health" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour à la santé
      </Link>

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

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Poids</th>
              <th className="px-4 py-3 font-medium">IMC</th>
              <th className="px-4 py-3 font-medium">Masse grasse</th>
              <th className="px-4 py-3 font-medium">Masse musculaire</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.calendarDate.toISOString()} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">
                  {new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-2">
                  {d.weight != null ? (
                    <span className="font-medium text-blue-600">{d.weight.toFixed(1)} kg</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2">{d.bmi != null ? d.bmi.toFixed(1) : "—"}</td>
                <td className="px-4 py-2">{d.bodyFatPercentage != null ? `${d.bodyFatPercentage.toFixed(1)}%` : "—"}</td>
                <td className="px-4 py-2">{d.muscleMass != null ? `${d.muscleMass.toFixed(1)} kg` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
