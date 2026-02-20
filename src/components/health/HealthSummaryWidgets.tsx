import { Moon, Heart, Footprints, Scale } from "lucide-react";
import { fetchLatestHealthSummary } from "@/actions/health";

export default async function HealthSummaryWidgets() {
  const { sleep, health } = await fetchLatestHealthSummary();

  const widgets = [
    {
      icon: <Moon className="h-5 w-5 text-indigo-500" />,
      label: "Sommeil",
      value: sleep?.totalHours ? `${sleep.totalHours}h` : "—",
      sub: sleep?.score ? `Score ${sleep.score}` : null,
    },
    {
      icon: <Heart className="h-5 w-5 text-red-500" />,
      label: "FC repos",
      value: health?.restingHR ? `${health.restingHR} bpm` : "—",
      sub: null,
    },
    {
      icon: <Footprints className="h-5 w-5 text-green-500" />,
      label: "Pas",
      value: health?.steps ? health.steps.toLocaleString("fr-FR") : "—",
      sub: null,
    },
    {
      icon: <Scale className="h-5 w-5 text-blue-500" />,
      label: "Poids",
      value: health?.weight ? `${health.weight} kg` : "—",
      sub: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {widgets.map((w) => (
        <div
          key={w.label}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <div className="rounded-lg bg-gray-50 p-2">{w.icon}</div>
          <div>
            <p className="text-xs text-gray-500">{w.label}</p>
            <p className="text-lg font-semibold text-gray-900">{w.value}</p>
            {w.sub && <p className="text-xs text-gray-400">{w.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
