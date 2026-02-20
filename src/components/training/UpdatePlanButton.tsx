"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CalendarClock } from "lucide-react";
import { updateTrainingPlan } from "@/actions/training";

export default function UpdatePlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  const [startDate, setStartDate] = useState("");

  function handleUpdate() {
    startTransition(async () => {
      await updateTrainingPlan(planId, startDate || undefined);
      setShowOptions(false);
      setStartDate("");
      router.refresh();
    });
  }

  if (showOptions) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="mb-3">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-blue-700">
            <CalendarClock className="h-4 w-4" />
            Début de la préparation
            <span className="font-normal text-blue-400">(optionnel)</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full max-w-xs rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-blue-500">
            Si tu t&apos;entraînes déjà, indique la date de début. Les semaines
            passées seront ajoutées et marquées comme complétées.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Mise à jour en cours...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Lancer la mise à jour
              </>
            )}
          </button>
          <button
            onClick={() => {
              setShowOptions(false);
              setStartDate("");
            }}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-blue-100"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowOptions(true)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100"
    >
      <RefreshCw className="h-4 w-4" />
      Adapter le plan
    </button>
  );
}
