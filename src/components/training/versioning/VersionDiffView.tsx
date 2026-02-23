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
  // Group changes by week
  const byWeek = new Map<number, SessionDiff[]>();
  for (const d of diff.details) {
    const list = byWeek.get(d.weekNumber) ?? [];
    list.push(d);
    byWeek.set(d.weekNumber, list);
  }

  const hasChanges = diff.sessionsAdded > 0 || diff.sessionsRemoved > 0 || diff.sessionsModified > 0;

  // Build summary text
  const summaryParts: string[] = [];
  if (diff.sessionsAdded > 0) summaryParts.push(`+${diff.sessionsAdded} ajoutée${diff.sessionsAdded > 1 ? "s" : ""}`);
  if (diff.sessionsRemoved > 0) summaryParts.push(`-${diff.sessionsRemoved} supprimée${diff.sessionsRemoved > 1 ? "s" : ""}`);
  if (diff.sessionsModified > 0) summaryParts.push(`${diff.sessionsModified} modifiée${diff.sessionsModified > 1 ? "s" : ""}`);
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
