"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CalendarClock } from "lucide-react";
import { updateTrainingPlan } from "@/actions/training";
import { Button } from "@/components/shared";

interface Props {
  planId: string;
  currentStartDate?: string | null; // format ISO "2025-01-15"
}

export default function UpdatePlanButton({ planId, currentStartDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  // Pré-remplit avec la date existante si présente
  const [startDate, setStartDate] = useState(currentStartDate ?? "");

  function handleUpdate() {
    startTransition(async () => {
      await updateTrainingPlan(planId, startDate || undefined);
      setShowOptions(false);
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
          <Button
            onClick={handleUpdate}
            loading={isPending}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            {isPending ? "Mise à jour en cours..." : "Lancer la mise à jour"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowOptions(false);
              setStartDate(currentStartDate ?? "");
            }}
            disabled={isPending}
          >
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost-primary"
      size="sm"
      onClick={() => setShowOptions(true)}
      icon={<RefreshCw className="h-4 w-4" />}
    >
      Adapter le plan
    </Button>
  );
}
