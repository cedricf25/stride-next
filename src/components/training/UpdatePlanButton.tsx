"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";
import { updateTrainingPlan } from "@/actions/training";
import { Button } from "@/components/shared";

interface Props {
  planId: string;
  currentStartDate?: string | null;
}

type FeedbackState =
  | { type: "idle" }
  | { type: "no_changes"; lastUpdatedAt: Date | null }
  | { type: "updated"; newActivitiesCount: number }
  | { type: "error"; message: string };

export default function UpdatePlanButton({ planId, currentStartDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  const [startDate, setStartDate] = useState(currentStartDate ?? "");
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });

  function handleUpdate(force = false) {
    startTransition(async () => {
      try {
        // Ne passer startDate que si elle a été MODIFIÉE (backfill explicite)
        const hasChangedStartDate = startDate && startDate !== currentStartDate;
        const result = await updateTrainingPlan(
          planId,
          hasChangedStartDate ? startDate : undefined,
          force
        );

        if (!result.updated) {
          setFeedback({
            type: "no_changes",
            lastUpdatedAt: result.lastUpdatedAt,
          });
        } else {
          setFeedback({
            type: "updated",
            newActivitiesCount: result.newActivitiesCount,
          });
          setShowOptions(false);
          router.refresh();
        }
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    });
  }

  function handleForceUpdate() {
    setFeedback({ type: "idle" });
    handleUpdate(true);
  }

  function handleClose() {
    setShowOptions(false);
    setStartDate(currentStartDate ?? "");
    setFeedback({ type: "idle" });
  }

  if (feedback.type === "no_changes") {
    const lastUpdate = feedback.lastUpdatedAt
      ? new Date(feedback.lastUpdatedAt).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "jamais";

    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="mb-3 flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="font-medium text-green-800">
              Aucune modification nécessaire
            </p>
            <p className="mt-1 text-sm text-green-600">
              Aucune nouvelle activité depuis la dernière mise à jour ({lastUpdate}).
              Le plan reste inchangé pour garantir ta stabilité d&apos;entraînement.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Fermer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleForceUpdate}
            loading={isPending}
            icon={<AlertTriangle className="h-4 w-4" />}
          >
            Forcer la régénération
          </Button>
        </div>
      </div>
    );
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
        {feedback.type === "error" && (
          <p className="mb-3 text-sm text-red-600">{feedback.message}</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleUpdate(false)}
            loading={isPending}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            {isPending ? "Mise à jour en cours..." : "Lancer la mise à jour"}
          </Button>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
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
