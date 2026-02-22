import { notFound } from "next/navigation";
import { fetchActivityDetail } from "@/actions/garmin";
import ActivityDetailHeader from "@/components/activity/ActivityDetailHeader";
import SplitTable from "@/components/activity/SplitTable";
import RunningDynamics from "@/components/activity/RunningDynamics";
import TrainingEffectCard from "@/components/activity/TrainingEffectCard";
import ActivityAiAnalysis from "@/components/activity/ActivityAiAnalysis";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await fetchActivityDetail(Number(id));

  if (!activity) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ActivityDetailHeader activity={activity} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrainingEffectCard activity={activity} />
        <RunningDynamics activity={activity} />
      </div>

      {activity.splits.length > 0 && (
        <div className="mt-8">
          <SplitTable splits={activity.splits} />
        </div>
      )}

      <div className="mt-8">
        <ActivityAiAnalysis
          activityId={activity.garminActivityId}
          existingAnalysis={activity.analysis?.analysis ?? null}
        />
      </div>
    </div>
  );
}
