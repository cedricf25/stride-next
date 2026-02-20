"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
} from "@/lib/format";
import type { FormattedActivity, ActivitiesResponse } from "@/types/garmin";

export async function fetchGarminActivities(
  page: number = 0,
  limit: number = 10
): Promise<ActivitiesResponse> {
  try {
    const user = await getOrCreateUser();

    const activities = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { startTimeLocal: "desc" },
      skip: page * limit,
      take: limit,
    });

    const formatted: FormattedActivity[] = activities.map((a) => ({
      id: Number(a.garminActivityId),
      name: a.activityName,
      date: formatDate(a.startTimeLocal.toISOString()),
      distance: formatDistance(a.distance),
      duration: formatDuration(a.duration),
      pace: formatPace(a.averageSpeed ?? 0),
      averageHR: a.averageHR ?? 0,
      maxHR: a.maxHR ?? 0,
      calories: a.calories ?? 0,
      elevationGain: Math.round(a.elevationGain ?? 0),
      cadence: Math.round(a.averageCadence ?? 0),
      aerobicTE: a.aerobicTrainingEffect ?? undefined,
      anaerobicTE: a.anaerobicTrainingEffect ?? undefined,
      vo2max: a.vo2max ?? undefined,
      strideLength: a.averageStrideLength ?? undefined,
    }));

    // rawActivities for AI analysis compatibility
    const rawActivities = activities.map((a) => ({
      activityId: Number(a.garminActivityId),
      activityName: a.activityName,
      startTimeLocal: a.startTimeLocal.toISOString(),
      distance: a.distance,
      duration: a.duration,
      movingDuration: a.movingDuration ?? 0,
      averageSpeed: a.averageSpeed ?? 0,
      averageHR: a.averageHR ?? 0,
      maxHR: a.maxHR ?? 0,
      calories: a.calories ?? 0,
      elevationGain: a.elevationGain ?? 0,
      elevationLoss: a.elevationLoss ?? 0,
      averageRunningCadenceInStepsPerMinute: a.averageCadence ?? 0,
      aerobicTrainingEffect: a.aerobicTrainingEffect ?? 0,
      anaerobicTrainingEffect: a.anaerobicTrainingEffect ?? 0,
      vo2max: a.vo2max ?? 0,
      activityType: { typeKey: a.activityType },
    }));

    return { activities: formatted, rawActivities };
  } catch (error) {
    console.error("Error fetching activities:", error);
    return {
      activities: [],
      rawActivities: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch activities",
    };
  }
}

export async function fetchActivityDetail(garminActivityId: number) {
  const activity = await prisma.activity.findUnique({
    where: { garminActivityId: BigInt(garminActivityId) },
    include: {
      splits: { orderBy: { splitNumber: "asc" } },
      analysis: true,
    },
  });

  if (!activity) return null;

  return {
    ...activity,
    garminActivityId: Number(activity.garminActivityId),
  };
}
