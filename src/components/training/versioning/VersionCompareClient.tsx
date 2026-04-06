"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import VersionHistoryList from "./VersionHistoryList";
import VersionDiffView from "./VersionDiffView";
import {
  comparePlanVersions,
  restorePlanVersion,
  deletePlanVersion,
  setDefaultVersion,
} from "@/actions/training-versions";
import { Card } from "@/components/shared";
import type { VersionSummary, VersionDiff, PlanSnapshot } from "@/types/training-version";

interface Props {
  planId: string;
  versions: VersionSummary[];
  currentVersion: number;
}

interface CompareResult {
  versionA: {
    versionNumber: number;
    createdAt: Date;
    changelogSummary: string | null;
    changelogDetails: string | null;
    snapshot: PlanSnapshot;
  };
  versionB: {
    versionNumber: number;
    createdAt: Date;
    changelogSummary: string | null;
    changelogDetails: string | null;
    snapshot: PlanSnapshot;
  };
  diff: VersionDiff;
}

export default function VersionCompareClient({
  planId,
  versions,
  currentVersion,
}: Props) {
  const router = useRouter();
  const initialA = versions[1]?.versionNumber ?? null;
  const initialB = versions[0]?.versionNumber ?? null;

  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([
    initialA,
    initialB,
  ]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Version management handlers
  const handleRestore = async (versionNumber: number) => {
    await restorePlanVersion(planId, versionNumber);
    router.refresh();
  };

  const handleDelete = async (versionNumber: number) => {
    await deletePlanVersion(planId, versionNumber);
    router.refresh();
  };

  const handleSetDefault = async (versionNumber: number) => {
    await setDefaultVersion(planId, versionNumber);
    router.refresh();
  };

  // Load initial comparison on mount
  useEffect(() => {
    if (initialA !== null && initialB !== null) {
      startTransition(async () => {
        try {
          const result = await comparePlanVersions(planId, initialA, initialB);
          setCompareResult(result);
        } catch (error) {
          console.error("Erreur lors de la comparaison initiale:", error);
        }
      });
    }
  }, [planId, initialA, initialB]);

  const handleSelectVersion = (position: 0 | 1, versionNumber: number) => {
    const newSelection: [number | null, number | null] = [...selectedVersions];

    // If already selected at this position, deselect
    if (newSelection[position] === versionNumber) {
      newSelection[position] = null;
    } else {
      // If selected at other position, swap
      if (newSelection[1 - position] === versionNumber) {
        newSelection[1 - position] = newSelection[position];
      }
      newSelection[position] = versionNumber;
    }

    setSelectedVersions(newSelection);

    // Auto-compare if both versions are selected
    if (newSelection[0] !== null && newSelection[1] !== null) {
      startTransition(async () => {
        try {
          const result = await comparePlanVersions(
            planId,
            newSelection[0]!,
            newSelection[1]!
          );
          setCompareResult(result);
        } catch (error) {
          console.error("Erreur lors de la comparaison:", error);
        }
      });
    } else {
      setCompareResult(null);
    }
  };

  if (versions.length < 2) {
    return (
      <Card>
        <p className="text-center text-[var(--text-muted)] py-8">
          Il faut au moins 2 versions pour comparer.
          <br />
          <span className="text-sm">
            Adaptez votre plan pour créer de nouvelles versions.
          </span>
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Version list */}
      <div className="lg:col-span-1">
        <VersionHistoryList
          versions={versions}
          currentVersion={currentVersion}
          selectedVersions={selectedVersions}
          onSelectVersion={handleSelectVersion}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
        />
      </div>

      {/* Diff view */}
      <div className="lg:col-span-2">
        {isPending ? (
          <Card>
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">Comparaison en cours...</span>
            </div>
          </Card>
        ) : compareResult ? (
          <VersionDiffView
            versionA={compareResult.versionA}
            versionB={compareResult.versionB}
            diff={compareResult.diff}
          />
        ) : (
          <Card>
            <p className="text-center text-[var(--text-muted)] py-12">
              Sélectionnez deux versions dans la liste pour voir les différences
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
