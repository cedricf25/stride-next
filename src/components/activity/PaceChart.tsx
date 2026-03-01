"use client";

import { formatPace } from "@/lib/format";

interface Split {
  splitNumber: number;
  averageSpeed: number | null;
  distance: number;
}

interface Props {
  splits: Split[];
  fastestSplitKm: number | null;
  slowestSplitKm: number | null;
  averageSpeed: number | null;
}

export default function PaceChart({ splits, fastestSplitKm, slowestSplitKm, averageSpeed }: Props) {
  // Filtrer les splits valides : allure > 0 ET distance >= 500m (ignorer splits partiels)
  const validSplits = splits.filter(s =>
    s.averageSpeed && s.averageSpeed > 0 && s.distance >= 500
  );

  if (validSplits.length < 2) return null;

  // Convertir vitesse (m/s) en pace (sec/km) - valeur plus haute = plus lent
  const paces = validSplits.map(s => ({
    km: s.splitNumber,
    pace: s.averageSpeed ? 1000 / s.averageSpeed : 0,
    speed: s.averageSpeed!,
  }));

  const minPace = Math.min(...paces.map(p => p.pace));
  const maxPace = Math.max(...paces.map(p => p.pace));

  // Recalculer fastest/slowest parmi les splits valides uniquement
  const actualFastest = paces.reduce((min, p) => p.pace < min.pace ? p : min, paces[0]);
  const actualSlowest = paces.reduce((max, p) => p.pace > max.pace ? p : max, paces[0]);

  // Hauteur max du graphique en pixels
  const chartHeight = 140;
  const minBarHeight = 20;

  // Calculer la hauteur en pixels (inversé : pace bas = barre haute)
  const range = maxPace - minPace || 1;
  const getBarHeight = (pace: number) => {
    const normalized = 1 - (pace - minPace) / range;
    return minBarHeight + normalized * (chartHeight - minBarHeight);
  };

  // Afficher les labels km de manière intelligente
  const showKmLabel = (km: number, index: number, total: number) => {
    if (total <= 12) return true;
    if (index === 0 || index === total - 1) return true;
    if (km % 5 === 0) return true;
    return false;
  };

  return (
    <div className="mt-5">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        Allure par kilomètre
      </div>

      {/* Container du graphique */}
      <div className="relative rounded-lg bg-[var(--bg-muted)] p-4">
        {/* Ligne moyenne */}
        {averageSpeed && (
          <div className="mb-2 flex items-center justify-end gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="inline-block h-px w-4 border-t-2 border-dashed border-[var(--accent-primary)]" />
            <span>Moyenne: <span className="font-medium text-[var(--accent-primary)]">{formatPace(averageSpeed)}</span></span>
          </div>
        )}

        {/* Barres */}
        <div className="flex items-end gap-1" style={{ height: `${chartHeight}px` }}>
          {paces.map((p, index) => {
            const isFastest = p.km === actualFastest.km;
            const isSlowest = p.km === actualSlowest.km;
            const barHeight = getBarHeight(p.pace);

            let bgClass = "bg-blue-400";
            if (isFastest) bgClass = "bg-green-500";
            else if (isSlowest) bgClass = "bg-amber-500";

            return (
              <div
                key={p.km}
                className="group relative flex flex-1 flex-col items-center justify-end"
                style={{ height: `${chartHeight}px` }}
              >
                {/* Tooltip au survol */}
                <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Km {p.km}: {formatPace(p.speed)}
                </div>

                {/* Label allure pour fastest/slowest */}
                {(isFastest || isSlowest) && (
                  <div
                    className={`absolute z-10 whitespace-nowrap text-[11px] font-bold ${
                      isFastest ? "text-green-600" : "text-amber-600"
                    }`}
                    style={{ bottom: `${barHeight + 4}px` }}
                  >
                    {formatPace(p.speed)}
                  </div>
                )}

                {/* Barre */}
                <div
                  className={`w-full rounded-t ${bgClass} transition-all hover:opacity-80`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>
            );
          })}
        </div>

        {/* Labels km */}
        <div className="mt-2 flex">
          {paces.map((p, index) => (
            <div key={p.km} className="flex-1 text-center text-[10px] text-[var(--text-tertiary)]">
              {showKmLabel(p.km, index, paces.length) ? p.km : ""}
            </div>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-green-500" />
          <span>Plus rapide (Km {actualFastest.km})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-500" />
          <span>Plus lent (Km {actualSlowest.km})</span>
        </div>
      </div>
    </div>
  );
}
