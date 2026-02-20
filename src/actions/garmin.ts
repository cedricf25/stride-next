"use server";

import { getGarminClient } from "@/lib/garmin-client";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
} from "@/lib/format";
import type {
  GarminActivity,
  FormattedActivity,
  ActivitiesResponse,
} from "@/types/garmin";

export async function fetchGarminActivities(): Promise<ActivitiesResponse> {
  try {
    const client = await getGarminClient();
    const rawActivities =
      (await client.getActivities(0, 5)) as unknown as GarminActivity[];

    const activities: FormattedActivity[] = rawActivities.map((activity) => ({
      id: activity.activityId,
      name: activity.activityName,
      date: formatDate(activity.startTimeLocal),
      distance: formatDistance(activity.distance),
      duration: formatDuration(activity.duration),
      pace: formatPace(activity.averageSpeed),
      averageHR: Math.round(activity.averageHR || 0),
      maxHR: Math.round(activity.maxHR || 0),
      calories: Math.round(activity.calories || 0),
      elevationGain: Math.round(activity.elevationGain || 0),
      cadence: Math.round(
        activity.averageRunningCadenceInStepsPerMinute || 0
      ),
    }));

    return { activities, rawActivities };
  } catch (error) {
    console.error("Error fetching Garmin activities:", error);
    return {
      activities: [],
      rawActivities: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Garmin activities",
    };
  }
}
