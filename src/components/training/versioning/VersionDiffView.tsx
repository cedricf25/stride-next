"use client";

import { Card } from "@/components/shared";
import SessionDiffCard from "./SessionDiffCard";
import VersionChangelogCard from "./VersionChangelogCard";
import type { SessionDiff, VersionDiff } from "@/types/training-version";

interface VersionInfo {
  versionNumber: number;
  createdAt: Date;
  changelogSummary?: string | null;
  changelogDetails?: string | null;
}

interface Props {
  versionA: VersionInfo;
  versionB: VersionInfo;
  diff: VersionDiff;
}

export default function VersionDiffView({ versionA, versionB, diff }: Props) {
  // Filtrer les modifications qui n'ont pas de changements significatifs à afficher
  // (cohérent avec SessionDiffCard qui retourne null dans ce cas)
  const isSignificantChange = (d: SessionDiff) => {
    if (d.changeType !== "modified") return true;
    const significantChanges = (d.changes ?? []).filter(
      (c) => c.before != null && c.after != null
    );
    return significantChanges.length > 0;
  };

  const filteredDetails = diff.details.filter(isSignificantChange);

  // Recalculer les stats avec les changements significatifs seulement
  const sessionsAdded = filteredDetails.filter((d) => d.changeType === "added").length;
  const sessionsRemoved = filteredDetails.filter((d) => d.changeType === "removed").length;
  const sessionsModified = filteredDetails.filter((d) => d.changeType === "modified").length;

  // Group changes by week
  const byWeek = new Map<number, SessionDiff[]>();
  for (const d of filteredDetails) {
    const list = byWeek.get(d.weekNumber) ?? [];
    list.push(d);
    byWeek.set(d.weekNumber, list);
  }

  const hasChanges = sessionsAdded > 0 || sessionsRemoved > 0 || sessionsModified > 0;

  // Build summary text
  const summaryParts: string[] = [];
  if (sessionsAdded > 0) summaryParts.push(`+${sessionsAdded} ajoutée${sessionsAdded > 1 ? "s" : ""}`);
  if (sessionsRemoved > 0) summaryParts.push(`-${sessionsRemoved} supprimée${sessionsRemoved > 1 ? "s" : ""}`);
  if (sessionsModified > 0) summaryParts.push(`${sessionsModified} modifiée${sessionsModified > 1 ? "s" : ""}`);
  if (diff.volumeChange !== 0) {
    summaryParts.push(`${diff.volumeChange > 0 ? "+" : ""}${diff.volumeChange.toFixed(1)} km`);
  }

  return (
    <div className="space-y-4">
      {/* Header compact */}
      <Card padding="sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-primary)]">
            v{versionA.versionNumber} → v{versionB.versionNumber}
          </span>
          {summaryParts.length > 0 ? (
            <span className="text-[var(--text-secondary)]">
              {summaryParts.join(" • ")}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">Aucun changement</span>
          )}
        </div>
      </Card>

      {/* Changelog IA */}
      <VersionChangelogCard
        summary={versionB.changelogSummary}
        details={versionB.changelogDetails}
      />

      {/* Changes by week - compact */}
      {hasChanges && (
        <Card>
          <h4 className="font-medium text-[var(--text-primary)] mb-3">
            Détail des modifications
          </h4>
          {[...byWeek.entries()]
            .sort(([a], [b]) => a - b)
            .map(([weekNum, sessions]) => (
              <div key={weekNum} className="mb-4 last:mb-0">
                <h5 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                  Semaine {weekNum}
                </h5>
                <div>
                  {sessions.map((s, i) => (
                    <SessionDiffCard key={i} {...s} />
                  ))}
                </div>
              </div>
            ))}
        </Card>
      )}

      {!hasChanges && (
        <Card>
          <p className="text-center text-[var(--text-muted)] py-4">
            Aucune modification entre ces versions
          </p>
        </Card>
      )}
    </div>
  );
}
