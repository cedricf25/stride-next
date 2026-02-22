"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { syncAll } from "@/actions/sync";
import { useAsyncAction } from "@/hooks/useAsyncAction";

function formatSyncDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SyncButton({
  lastSyncAt,
}: {
  lastSyncAt: string | null;
}) {
  const [syncDate, setSyncDate] = useState(lastSyncAt);

  const { execute: handleSync, loading: syncing } = useAsyncAction(syncAll, {
    refreshOnSuccess: true,
    onSuccess: () => setSyncDate(new Date().toISOString()),
  });

  return (
    <div>
      <button
        onClick={() => handleSync()}
        disabled={syncing}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
      >
        <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Synchronisation..." : "Synchroniser"}
      </button>
      {syncDate && (
        <p className="px-3 pt-1 text-xs text-gray-400">
          {formatSyncDate(syncDate)}
        </p>
      )}
    </div>
  );
}
