"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CalendarClock } from "lucide-react";
import { updateTrainingPlan } from "@/actions/training-update";
import { Button } from "@/components/shared";

interface Props {
  planId: string;
  currentStartDate?: string | null;
}

export default function UpdatePlanButton({ planId, currentStartDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  const [startDate, setStartDate] = useState(currentStartDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPending) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPending]);

  function handleUpdate() {
    startTransition(async () => {
      try {
        setError(null);
        const hasChangedStartDate = startDate && startDate !== currentStartDate;
        await updateTrainingPlan(
          planId,
          hasChangedStartDate ? startDate : undefined,
        );
        setShowOptions(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  }

  function handleClose() {
    setShowOptions(false);
    setStartDate(currentStartDate ?? "");
    setError(null);
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
        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleUpdate}
            loading={isPending}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            {isPending ? "Mise à jour en cours..." : "Lancer la mise à jour"}
          </Button>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
        </div>
        {isPending && (
          <p className="mt-2 text-xs text-blue-500">
            Le modèle IA analyse ton plan... Cela peut prendre 1-2 minutes.
            <span className="ml-2 font-mono">
              {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
            </span>
          </p>
        )}
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
      Mise à jour du plan
    </Button>
  );
}
