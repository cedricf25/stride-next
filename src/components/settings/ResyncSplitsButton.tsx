"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { resyncAllSplits } from "@/actions/sync";

export default function ResyncSplitsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    synced: number;
    errors: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResync = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await resyncAllSplits();
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la re-synchronisation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-secondary)]">
        Re-synchronise les splits de toutes vos activités avec les données enrichies
        (foulée, oscillation verticale, puissance, statistiques d&apos;allure).
      </p>

      <button
        onClick={handleResync}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Re-synchronisation en cours..." : "Re-synchroniser les splits"}
      </button>

      {result && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Re-synchronisation terminée</p>
            <p className="text-green-700">
              {result.synced} activités mises à jour sur {result.total}
              {result.errors > 0 && ` (${result.errors} erreurs)`}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Erreur</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
