"use server";

import { prisma } from "@/lib/prisma";
import { getGarminClient } from "@/lib/garmin-client";
import { getOrCreateUser } from "@/lib/user";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GarminRaw = any;

export async function syncActivities(count: number = 20) {
  const user = await getOrCreateUser();
  const client = await getGarminClient();

  const rawActivities = (await client.getActivities(0, count)) as GarminRaw[];

  for (const raw of rawActivities) {
    const activityId = BigInt(raw.activityId);

    const existing = await prisma.activity.findUnique({
      where: { garminActivityId: activityId },
    });

    await prisma.activity.upsert({
      where: { garminActivityId: activityId },
      update: {
        activityName: raw.activityName ?? "Course",
        activityType: raw.activityType?.typeKey ?? "running",
        distance: raw.distance ?? 0,
        duration: raw.duration ?? 0,
        movingDuration: raw.movingDuration ?? null,
        elapsedDuration: raw.elapsedDuration ?? null,
        averageSpeed: raw.averageSpeed ?? null,
        maxSpeed: raw.maxSpeed ?? null,
        averageHR: raw.averageHR ? Math.round(raw.averageHR) : null,
        maxHR: raw.maxHR ? Math.round(raw.maxHR) : null,
        calories: raw.calories ? Math.round(raw.calories) : null,
        elevationGain: raw.elevationGain ?? null,
        elevationLoss: raw.elevationLoss ?? null,
        minElevation: raw.minElevation ?? null,
        maxElevation: raw.maxElevation ?? null,
        averageCadence: raw.averageRunningCadenceInStepsPerMinute ?? null,
        maxCadence: raw.maxRunningCadenceInStepsPerMinute ?? null,
        averageStrideLength: raw.avgStrideLength ?? null,
        averageGCT: raw.avgGroundContactTime ?? null,
        averageVerticalOscillation: raw.avgVerticalOscillation ?? null,
        averageVerticalRatio: raw.avgVerticalRatio ?? null,
        aerobicTrainingEffect: raw.aerobicTrainingEffect ?? null,
        anaerobicTrainingEffect: raw.anaerobicTrainingEffect ?? null,
        trainingStressScore: raw.trainingStressScore ?? null,
        vo2max: raw.vO2MaxValue ?? null,
        avgTemperature: raw.avgTemperature ?? null,
        startLatitude: raw.startLatitude ?? null,
        startLongitude: raw.startLongitude ?? null,
        locationName: raw.locationName ?? null,
        description: raw.description ?? null,
      },
      create: {
        garminActivityId: activityId,
        userId: user.id,
        activityName: raw.activityName ?? "Course",
        activityType: raw.activityType?.typeKey ?? "running",
        startTimeLocal: new Date(raw.startTimeLocal),
        startTimeGMT: raw.startTimeGMT ? new Date(raw.startTimeGMT) : null,
        distance: raw.distance ?? 0,
        duration: raw.duration ?? 0,
        movingDuration: raw.movingDuration ?? null,
        elapsedDuration: raw.elapsedDuration ?? null,
        averageSpeed: raw.averageSpeed ?? null,
        maxSpeed: raw.maxSpeed ?? null,
        averageHR: raw.averageHR ? Math.round(raw.averageHR) : null,
        maxHR: raw.maxHR ? Math.round(raw.maxHR) : null,
        calories: raw.calories ? Math.round(raw.calories) : null,
        elevationGain: raw.elevationGain ?? null,
        elevationLoss: raw.elevationLoss ?? null,
        minElevation: raw.minElevation ?? null,
        maxElevation: raw.maxElevation ?? null,
        averageCadence: raw.averageRunningCadenceInStepsPerMinute ?? null,
        maxCadence: raw.maxRunningCadenceInStepsPerMinute ?? null,
        averageStrideLength: raw.avgStrideLength ?? null,
        averageGCT: raw.avgGroundContactTime ?? null,
        averageVerticalOscillation: raw.avgVerticalOscillation ?? null,
        averageVerticalRatio: raw.avgVerticalRatio ?? null,
        aerobicTrainingEffect: raw.aerobicTrainingEffect ?? null,
        anaerobicTrainingEffect: raw.anaerobicTrainingEffect ?? null,
        trainingStressScore: raw.trainingStressScore ?? null,
        vo2max: raw.vO2MaxValue ?? null,
        avgTemperature: raw.avgTemperature ?? null,
        startLatitude: raw.startLatitude ?? null,
        startLongitude: raw.startLongitude ?? null,
        locationName: raw.locationName ?? null,
        description: raw.description ?? null,
      },
    });

    // Sync splits pour les nouvelles activités
    if (!existing) {
      try {
        const detail = await client.getActivity({ activityId: raw.activityId });
        const splits = (detail as GarminRaw)?.splitSummaries;
        if (Array.isArray(splits)) {
          for (const split of splits) {
            if (split.splitType === "RUN_LAP" || split.splitType === "KM") {
              await prisma.activitySplit.upsert({
                where: {
                  activityId_splitNumber_splitType: {
                    activityId: (
                      await prisma.activity.findUnique({
                        where: { garminActivityId: activityId },
                      })
                    )!.id,
                    splitNumber: split.numSplits ?? split.splitNumber ?? 0,
                    splitType: split.splitType === "KM" ? "km" : "lap",
                  },
                },
                update: {},
                create: {
                  activityId: (
                    await prisma.activity.findUnique({
                      where: { garminActivityId: activityId },
                    })
                  )!.id,
                  splitNumber: split.numSplits ?? split.splitNumber ?? 0,
                  splitType: split.splitType === "KM" ? "km" : "lap",
                  distance: split.distance ?? 0,
                  duration: split.duration ?? 0,
                  averageSpeed: split.averageSpeed ?? null,
                  averageHR: split.averageHR ? Math.round(split.averageHR) : null,
                  maxHR: split.maxHR ? Math.round(split.maxHR) : null,
                  averageCadence: split.averageRunningCadenceInStepsPerMinute ?? null,
                  elevationGain: split.elevationGain ?? null,
                  elevationLoss: split.elevationLoss ?? null,
                  averageGCT: split.avgGroundContactTime ?? null,
                },
              });
            }
          }
        }
      } catch (e) {
        console.error(`Failed to sync splits for activity ${raw.activityId}:`, e);
      }
    }
  }

  return { synced: rawActivities.length };
}

export async function syncSleepData(days: number = 14) {
  const user = await getOrCreateUser();
  const client = await getGarminClient();

  let synced = 0;
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    try {
      const sleep = (await client.getSleepData(date)) as GarminRaw;
      if (!sleep || !sleep.dailySleepDTO) continue;

      const dto = sleep.dailySleepDTO;
      const calendarDate = new Date(dateStr + "T00:00:00");

      // Body battery — top-level sleep, pas dans dailySleepDTO
      const bodyBatteryChange: number | null = sleep.bodyBatteryChange ?? null;
      let startBodyBattery: number | null = null;
      let endBodyBattery: number | null = null;
      if (Array.isArray(sleep.sleepBodyBattery) && sleep.sleepBodyBattery.length > 0) {
        startBodyBattery = sleep.sleepBodyBattery[0]?.value ?? null;
        endBodyBattery = sleep.sleepBodyBattery[sleep.sleepBodyBattery.length - 1]?.value ?? null;
      }

      await prisma.sleepRecord.upsert({
        where: {
          userId_calendarDate: {
            userId: user.id,
            calendarDate,
          },
        },
        update: {
          totalSleepSeconds: dto.sleepTimeSeconds ?? null,
          deepSleepSeconds: dto.deepSleepSeconds ?? null,
          lightSleepSeconds: dto.lightSleepSeconds ?? null,
          remSleepSeconds: dto.remSleepSeconds ?? null,
          awakeSleepSeconds: dto.awakeSleepSeconds ?? null,
          sleepScore: dto.sleepScores?.overall?.value ?? null,
          sleepQualifier: dto.sleepScores?.overall?.qualifierKey ?? null,
          avgOvernightHRV: sleep.restingHeartRate ?? null,
          restingHeartRate: dto.averageHeartRate ?? null,
          avgSleepStress: dto.averageStressLevel ?? null,
          bodyBatteryChange,
          startBodyBattery,
          endBodyBattery,
        },
        create: {
          userId: user.id,
          calendarDate,
          sleepStartTimestamp: dto.sleepStartTimestampLocal
            ? new Date(dto.sleepStartTimestampLocal)
            : null,
          sleepEndTimestamp: dto.sleepEndTimestampLocal
            ? new Date(dto.sleepEndTimestampLocal)
            : null,
          totalSleepSeconds: dto.sleepTimeSeconds ?? null,
          deepSleepSeconds: dto.deepSleepSeconds ?? null,
          lightSleepSeconds: dto.lightSleepSeconds ?? null,
          remSleepSeconds: dto.remSleepSeconds ?? null,
          awakeSleepSeconds: dto.awakeSleepSeconds ?? null,
          sleepScore: dto.sleepScores?.overall?.value ?? null,
          sleepQualifier: dto.sleepScores?.overall?.qualifierKey ?? null,
          avgOvernightHRV: sleep.restingHeartRate ?? null,
          restingHeartRate: dto.averageHeartRate ?? null,
          avgSleepStress: dto.averageStressLevel ?? null,
          bodyBatteryChange,
          startBodyBattery,
          endBodyBattery,
        },
      });
      synced++;
    } catch (e) {
      console.error(`Failed to sync sleep for ${dateStr}:`, e);
    }
  }

  return { synced };
}

export async function syncHealthMetrics(days: number = 14) {
  const user = await getOrCreateUser();
  const client = await getGarminClient();

  let synced = 0;
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const calendarDate = new Date(dateStr + "T00:00:00");

    try {
      let restingHR: number | null = null;
      let maxHR: number | null = null;
      let minHR: number | null = null;
      let weight: number | null = null;
      let bmi: number | null = null;
      let bodyFat: number | null = null;
      let muscleMass: number | null = null;
      let totalSteps: number | null = null;

      try {
        const hr = (await client.getHeartRate(date)) as GarminRaw;
        if (hr) {
          restingHR = hr.restingHeartRate ?? null;
          maxHR = hr.maxHeartRate ?? null;
          minHR = hr.minHeartRate ?? null;
        }
      } catch { /* ignore */ }

      try {
        const weightData = (await client.getDailyWeightData(date)) as GarminRaw;
        if (weightData?.dateWeightList?.[0]) {
          const w = weightData.dateWeightList[0];
          weight = w.weight ? w.weight / 1000 : null; // g → kg
          bmi = w.bmi ?? null;
          bodyFat = w.bodyFat ?? null;
          muscleMass = w.muscleMass ? w.muscleMass / 1000 : null; // g → kg
        }
      } catch { /* ignore */ }

      try {
        const steps = await client.getSteps(date);
        totalSteps = typeof steps === "number" ? steps : null;
      } catch { /* ignore */ }

      // Only upsert if we have at least some data
      if (restingHR !== null || weight !== null || totalSteps !== null) {
        await prisma.healthMetric.upsert({
          where: {
            userId_calendarDate: {
              userId: user.id,
              calendarDate,
            },
          },
          update: {
            restingHeartRate: restingHR,
            maxHeartRate: maxHR,
            minHeartRate: minHR,
            weight,
            bmi,
            bodyFatPercentage: bodyFat,
            muscleMass,
            totalSteps,
          },
          create: {
            userId: user.id,
            calendarDate,
            restingHeartRate: restingHR,
            maxHeartRate: maxHR,
            minHeartRate: minHR,
            weight,
            bmi,
            bodyFatPercentage: bodyFat,
            muscleMass,
            totalSteps,
          },
        });
        synced++;
      }
    } catch (e) {
      console.error(`Failed to sync health for ${dateStr}:`, e);
    }
  }

  return { synced };
}

export async function syncUserProfile() {
  const user = await getOrCreateUser();
  const client = await getGarminClient();

  try {
    const settings = (await client.getUserSettings()) as GarminRaw;
    if (settings?.userData) {
      const data = settings.userData;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          weight: data.weight ? data.weight / 1000 : undefined, // g → kg
          height: data.height ? data.height / 10 : undefined, // mm → cm
          restingHR: data.restingHeartRate ?? undefined,
          maxHR: data.maxHeartRate ?? undefined,
          vo2max: data.vo2Max ?? undefined,
        },
      });
    }
  } catch (e) {
    console.error("Failed to sync user profile:", e);
  }

  return { synced: true };
}

export async function syncAll() {
  const results = {
    profile: { synced: false },
    activities: { synced: 0 },
    sleep: { synced: 0 },
    health: { synced: 0 },
  };

  try {
    results.profile = await syncUserProfile();
  } catch (e) {
    console.error("syncUserProfile failed:", e);
  }

  try {
    results.activities = await syncActivities(20);
  } catch (e) {
    console.error("syncActivities failed:", e);
  }

  try {
    results.sleep = await syncSleepData(14);
  } catch (e) {
    console.error("syncSleepData failed:", e);
  }

  try {
    results.health = await syncHealthMetrics(14);
  } catch (e) {
    console.error("syncHealthMetrics failed:", e);
  }

  return results;
}
