"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Play, Trash2, Calendar } from "lucide-react";
import {
  fetchRecentActivitiesForTest,
  simulateActivityForPlan,
  deleteSimulatedActivities,
  checkForPlanUpdates,
} from "@/actions/training";
import { Button, Card } from "@/components/shared";
import { formatDistance, formatDuration } from "@/lib/format";

interface Props {
  planId: string;
}

type Activity = Awaited<ReturnType<typeof fetchRecentActivitiesForTest>>[0];

export default function TestModePanel({ planId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activities.length === 0) {
      fetchRecentActivitiesForTest(15).then(setActivities);
    }
  }, [isOpen, activities.length]);

  useEffect(() => {
    if (isOpen) {
      checkForPlanUpdates(planId).then((result) => {
        if (result.shouldUpdate) {
          setUpdateStatus(
            result.reason === "new_activities"
              ? `${result.newActivities.length} nouvelle(s) activité(s) détectée(s)`
              : "Mise à jour disponible"
          );
        } else {
          setUpdateStatus("Aucune nouvelle activité");
        }
      });
    }
  }, [isOpen, planId]);

  function handleSimulate() {
    if (!selectedId) return;

    startTransition(async () => {
      try {
        const result = await simulateActivityForPlan(
          planId,
          selectedId,
          new Date(targetDate)
        );
        setFeedback(`Activité simulée : ${result.activityName}`);

        const status = await checkForPlanUpdates(planId);
        setUpdateStatus(
          status.shouldUpdate
            ? `${status.newActivities.length} nouvelle(s) activité(s)`
            : "Aucune nouvelle activité"
        );

        router.refresh();
      } catch (error) {
        setFeedback(`Erreur : ${error instanceof Error ? error.message : "Inconnue"}`);
      }
    });
  }

  function handleCleanup() {
    startTransition(async () => {
      const result = await deleteSimulatedActivities();
      setFeedback(`${result.deletedCount} activité(s) simulée(s) supprimée(s)`);

      const status = await checkForPlanUpdates(planId);
      setUpdateStatus(
        status.shouldUpdate
          ? `${status.newActivities.length} nouvelle(s) activité(s)`
          : "Aucune nouvelle activité"
      );

      router.refresh();
    });
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        icon={<FlaskConical className="h-4 w-4" />}
        className="text-orange-600"
      >
        Mode test
      </Button>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium text-orange-800">
          <FlaskConical className="h-5 w-5" />
          Mode test - Simulation d&apos;activités
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Fermer
        </Button>
      </div>

      {updateStatus && (
        <div className="mt-3 rounded bg-white/50 px-3 py-2 text-sm">
          <span className="font-medium">Statut :</span> {updateStatus}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-orange-700">
            Activité source
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded border border-orange-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Sélectionner une activité...</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.activityName} - {formatDistance(a.distance)} - {formatDuration(a.duration)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-orange-700">
            <Calendar className="h-4 w-4" />
            Date cible
          </label>
          <input
            type="datetime-local"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded border border-orange-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        {feedback && (
          <p className="rounded bg-white/50 px-3 py-2 text-sm text-orange-700">
            {feedback}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSimulate}
            loading={isPending}
            disabled={!selectedId}
            icon={<Play className="h-4 w-4" />}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Simuler
          </Button>
          <Button
            variant="ghost"
            onClick={handleCleanup}
            loading={isPending}
            icon={<Trash2 className="h-4 w-4" />}
            className="text-red-600"
          >
            Nettoyer simulations
          </Button>
        </div>
      </div>
    </Card>
  );
}
