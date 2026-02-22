"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { generatePredictions } from "@/actions/predictions";
import { Button } from "@/components/shared";

export default function RefreshPredictionsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      await generatePredictions();
      router.refresh();
    });
  }

  return (
    <Button
      onClick={handleRefresh}
      loading={isPending}
      icon={<RefreshCw className="h-4 w-4" />}
    >
      {isPending ? "Analyse en cours..." : "Générer les prédictions"}
    </Button>
  );
}
