import { Gauge } from "lucide-react";
import Card from "@/components/shared/Card";
import SectionHeader from "@/components/shared/SectionHeader";

interface Zone {
  label: string;
  range: string;
  pctVma: string;
  color: "red" | "orange" | "yellow" | "green";
}

interface Props {
  vo2max: number;
  vmaKmh: number;
  zones: {
    vma: Zone;
    seuil: Zone;
    tempo: Zone;
    ef: Zone;
  };
}

const colorStyles = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-green-50 text-green-700 border-green-200",
} as const;

const dotStyles = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-amber-500",
  green: "bg-green-500",
} as const;

export default function PaceZonesCard({ vo2max, vmaKmh, zones }: Props) {
  const allZones = [zones.vma, zones.seuil, zones.tempo, zones.ef];

  return (
    <Card padding="sm">
      <SectionHeader
        icon={<Gauge className="h-4 w-4 text-blue-600" />}
        title="Allures de référence"
        size="sm"
        className="mb-3"
      >
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>VO2max {vo2max}</span>
          <span>VMA {vmaKmh} km/h</span>
        </div>
      </SectionHeader>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {allZones.map((zone) => (
          <div
            key={zone.label}
            className={`rounded-lg border px-3 py-2 ${colorStyles[zone.color]}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dotStyles[zone.color]}`} />
              <span className="text-xs font-semibold">{zone.label}</span>
            </div>
            <div className="mt-1 text-sm font-bold">{zone.range} /km</div>
            <div className="text-xs opacity-70">{zone.pctVma} VMA</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
