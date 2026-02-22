"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTrainingPlan } from "@/actions/training";
import { Button } from "@/components/shared";

export default function DeletePlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteTrainingPlan(planId);
      router.push("/training");
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Supprimer ce plan ?</span>
        <Button variant="danger" size="sm" onClick={handleDelete} loading={isPending}>
          {isPending ? "Suppression..." : "Confirmer"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost-danger"
      size="sm"
      onClick={() => setShowConfirm(true)}
      icon={<Trash2 className="h-4 w-4" />}
    >
      Supprimer
    </Button>
  );
}
