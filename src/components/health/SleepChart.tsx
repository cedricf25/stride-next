import { formatShortDate } from "@/lib/chart-utils";
import EmptyState from "@/components/shared/EmptyState";
import ChartContainer from "@/components/shared/ChartContainer";
import ChartLegend from "@/components/shared/ChartLegend";

interface SleepData {
  calendarDate: Date;
  deepSleepSeconds: number | null;
  lightSleepSeconds: number | null;
  remSleepSeconds: number | null;
  awakeSleepSeconds: number | null;
  sleepScore: number | null;
}

interface Props {
  data: SleepData[];
}

export default function SleepChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState title="Sommeil" message="Aucune donnée de sommeil" />
    );
  }

  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 10, bottom: 30, left: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = Math.max(4, (chartW / data.length) * 0.7);
  const gap = chartW / data.length;

  const maxSeconds = Math.max(
    ...data.map(
      (d) =>
        (d.deepSleepSeconds ?? 0) +
        (d.lightSleepSeconds ?? 0) +
        (d.remSleepSeconds ?? 0) +
        (d.awakeSleepSeconds ?? 0)
    )
  );
  const scale = maxSeconds > 0 ? chartH / maxSeconds : 1;

  return (
    <ChartContainer
      title="Sommeil"
      legend={
        <ChartLegend
          items={[
            { label: "Profond", color: "bg-[#4338ca]" },
            { label: "Léger", color: "bg-[#818cf8]" },
            { label: "REM", color: "bg-[#c4b5fd]" },
            { label: "Éveillé", color: "bg-[#fbbf24]" },
          ]}
        />
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {data.map((d, i) => {
          const x = pad.left + i * gap + gap / 2 - barW / 2;
          const deep = (d.deepSleepSeconds ?? 0) * scale;
          const light = (d.lightSleepSeconds ?? 0) * scale;
          const rem = (d.remSleepSeconds ?? 0) * scale;
          const awake = (d.awakeSleepSeconds ?? 0) * scale;
          const baseY = pad.top + chartH;

          return (
            <g key={i}>
              <rect x={x} y={baseY - deep} width={barW} height={deep} fill="#4338ca" rx="1" />
              <rect x={x} y={baseY - deep - light} width={barW} height={light} fill="#818cf8" rx="1" />
              <rect x={x} y={baseY - deep - light - rem} width={barW} height={rem} fill="#c4b5fd" rx="1" />
              <rect x={x} y={baseY - deep - light - rem - awake} width={barW} height={awake} fill="#fbbf24" rx="1" />
              {i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 5}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)]"
                  fontSize="8"
                >
                  {formatShortDate(new Date(d.calendarDate))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </ChartContainer>
  );
}
