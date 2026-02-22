"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
} from "@/lib/format";
import type {
  FormattedActivity,
  ActivitiesResponse,
  ActivityFilters,
} from "@/types/garmin";

function buildDateFilter(period: ActivityFilters["period"]): Date | undefined {
  if (!period || period === "all") return undefined;
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

function buildOrderBy(filters?: ActivityFilters) {
  const sortOrder = filters?.sortOrder ?? "desc";
  switch (filters?.sortBy) {
    case "distance":
      return { distance: sortOrder as "asc" | "desc" };
    case "pace":
      return { averageSpeed: (sortOrder === "asc" ? "desc" : "asc") as "asc" | "desc" };
    case "duration":
      return { duration: sortOrder as "asc" | "desc" };
    default:
      return { startTimeLocal: sortOrder as "asc" | "desc" };
  }
}

export async function fetchGarminActivities(
  page: number = 0,
  limit: number = 10,
  filters?: ActivityFilters
): Promise<ActivitiesResponse> {
  try {
    const user = await getAuthenticatedUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: user.id };

    if (filters?.search) {
      where.activityName = { contains: filters.search };
    }

    const dateFrom = buildDateFilter(filters?.period);
    if (dateFrom) {
      where.startTimeLocal = { gte: dateFrom };
    }

    if (filters?.distanceMin != null || filters?.distanceMax != null) {
      where.distance = {};
      if (filters.distanceMin != null) where.distance.gte = filters.distanceMin;
      if (filters?.distanceMax != null) where.distance.lte = filters.distanceMax;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: buildOrderBy(filters),
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
    if (isRedirectError(error)) throw error;
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
