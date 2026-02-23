"use client";

import { useState } from "react";
import { History, MoreVertical, RotateCcw, Trash2, Star } from "lucide-react";
import { Card, Badge } from "@/components/shared";
import type { VersionSummary } from "@/types/training-version";

interface Props {
  versions: VersionSummary[];
  currentVersion: number;
  selectedVersions: [number | null, number | null];
  onSelectVersion: (position: 0 | 1, versionNumber: number) => void;
  onRestore?: (versionNumber: number) => Promise<void>;
  onDelete?: (versionNumber: number) => Promise<void>;
  onSetDefault?: (versionNumber: number) => Promise<void>;
}

const triggerLabels: Record<string, string> = {
  initial: "Création",
  manual_update: "Adaptation",
  backfill: "Rétrospective",
  restore: "Restauration",
};

export default function VersionHistoryList({
  versions,
  currentVersion,
  selectedVersions,
  onSelectVersion,
  onRestore,
  onDelete,
  onSetDefault,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (
    action: "restore" | "delete" | "setDefault",
    versionNumber: number,
    versionId: string
  ) => {
    setLoadingAction(versionId);
    try {
      if (action === "restore" && onRestore) {
        await onRestore(versionNumber);
      } else if (action === "delete" && onDelete) {
        await onDelete(versionNumber);
      } else if (action === "setDefault" && onSetDefault) {
        await onSetDefault(versionNumber);
      }
    } finally {
      setLoadingAction(null);
      setOpenMenuId(null);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-[var(--text-muted)]" />
        <h3 className="font-semibold text-[var(--text-primary)]">
          Versions
        </h3>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-4">
        Cliquez sur deux versions pour comparer
      </p>

      <div className="space-y-1">
        {versions.map((v) => {
          const isSelectedA = selectedVersions[0] === v.versionNumber;
          const isSelectedB = selectedVersions[1] === v.versionNumber;
          const isSelected = isSelectedA || isSelectedB;
          const isCurrent = v.versionNumber === currentVersion;
          const isMenuOpen = openMenuId === v.id;
          const isLoading = loadingAction === v.id;

          // Build change summary
          const changes: string[] = [];
          if (v.sessionsAdded > 0) changes.push(`+${v.sessionsAdded}`);
          if (v.sessionsRemoved > 0) changes.push(`-${v.sessionsRemoved}`);
          if (v.sessionsModified > 0) changes.push(`~${v.sessionsModified}`);

          return (
            <div
              key={v.id}
              className={`relative rounded-md border transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)]"
              } ${isLoading ? "opacity-50" : ""} ${isMenuOpen ? "z-20" : ""}`}
            >
              <button
                onClick={() => {
                  if (isSelectedA) {
                    onSelectVersion(0, v.versionNumber);
                  } else if (isSelectedB) {
                    onSelectVersion(1, v.versionNumber);
                  } else if (selectedVersions[0] === null) {
                    onSelectVersion(0, v.versionNumber);
                  } else if (selectedVersions[1] === null) {
                    onSelectVersion(1, v.versionNumber);
                  } else {
                    onSelectVersion(1, v.versionNumber);
                  }
                }}
                className="w-full text-left px-3 py-2 pr-10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      v{v.versionNumber}
                    </span>
                    {isCurrent && (
                      <Badge color="green" size="sm">Actuelle</Badge>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {triggerLabels[v.triggerReason ?? ""] ?? v.triggerReason}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {changes.length > 0 && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {changes.join(" ")}
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(v.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>

                {v.changelogSummary && (
                  <p className="mt-1 text-xs text-[var(--text-tertiary)] line-clamp-1">
                    {v.changelogSummary}
                  </p>
                )}
              </button>

              {/* Menu actions */}
              {(onRestore || onDelete || onSetDefault) && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : v.id);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-md shadow-lg border border-[var(--border-default)] py-1 min-w-[160px]">
                      {!isCurrent && onRestore && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("restore", v.versionNumber, v.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restaurer
                        </button>
                      )}
                      {!isCurrent && onSetDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("setDefault", v.versionNumber, v.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                        >
                          <Star className="h-4 w-4" />
                          Définir par défaut
                        </button>
                      )}
                      {!isCurrent && versions.length > 1 && onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("delete", v.versionNumber, v.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      )}
                      {isCurrent && (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          Version actuelle
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
