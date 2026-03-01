"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getAuthenticatedGarminClient } from "@/lib/user";
import { matchActivitiesToPlans } from "./training";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GarminRaw = any;

// Calcule les statistiques d'allure à partir des splits
function calculatePaceStats(splits: { averageSpeed: number | null; splitNumber: number; distance?: number }[]) {
  // Filtrer les splits valides : vitesse > 0 ET distance >= 500m (ignorer les splits partiels)
  const validSplits = splits.filter(s =>
    s.averageSpeed && s.averageSpeed > 0 &&
    (s.distance === undefined || s.distance >= 500)
  );
  if (validSplits.length < 2) return null;

  const speeds = validSplits.map(s => s.averageSpeed!);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  // Variabilité (écart-type en %)
  const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length;
  const stdDev = Math.sqrt(variance);
  const paceVariability = (stdDev / avgSpeed) * 100;

  // Negative split ratio (2ème moitié / 1ère moitié)
  const mid = Math.floor(validSplits.length / 2);
  const firstHalfAvg = speeds.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalfAvg = speeds.slice(mid).reduce((a, b) => a + b, 0) / (speeds.length - mid);
  const negativeSplitRatio = secondHalfAvg / firstHalfAvg;

  // Km le plus rapide et le plus lent
  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);
  const fastestSplitKm = validSplits.find(s => s.averageSpeed === maxSpeed)?.splitNumber ?? null;
  const slowestSplitKm = validSplits.find(s => s.averageSpeed === minSpeed)?.splitNumber ?? null;

  // Pace decay (ralentissement entre le 1er et dernier km)
  const firstKmSpeed = speeds[0];
  const lastKmSpeed = speeds[speeds.length - 1];
  const paceDecay = ((firstKmSpeed - lastKmSpeed) / firstKmSpeed) * 100;

  // Even pace score (0-100, basé sur la variabilité)
  // Score parfait = 100 si variabilité = 0, score de 0 si variabilité >= 25%
  // Échelle : 5% → 80, 10% → 60, 15% → 40, 20% → 20, 25% → 0
  const evenPaceScore = Math.max(0, Math.min(100, Math.round(100 - paceVariability * 4)));

  return {
    paceVariability: Math.round(paceVariability * 100) / 100,
    negativeSplitRatio: Math.round(negativeSplitRatio * 1000) / 1000,
    fastestSplitKm,
    slowestSplitKm,
    paceDecay: Math.round(paceDecay * 100) / 100,
    evenPaceScore,
  };
}

export async function syncActivities(count: number = 64) {
  const { user, client } = await getAuthenticatedGarminClient();

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
        averagePower: raw.avgPower ?? null,
        maxPower: raw.maxPower ?? null,
        normalizedPower: raw.normPower ?? null,
        staminaPercent: raw.endStamina ?? null,
        potentialStamina: raw.endPotentialStamina ?? null,
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
        averagePower: raw.avgPower ?? null,
        maxPower: raw.maxPower ?? null,
        normalizedPower: raw.normPower ?? null,
        staminaPercent: raw.endStamina ?? null,
        potentialStamina: raw.endPotentialStamina ?? null,
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

    // Sync splits pour les nouvelles activités via l'endpoint /splits (lapDTOs)
    if (!existing) {
      try {
        const splitsData = await client.get<GarminRaw>(
          `https://connectapi.garmin.com/activity-service/activity/${raw.activityId}/splits`
        );
        const laps = splitsData?.lapDTOs;

        const dbActivity = await prisma.activity.findUnique({
          where: { garminActivityId: activityId },
        });
        if (!dbActivity) continue;

        if (Array.isArray(laps) && laps.length > 0) {
          const kmSplits: { averageSpeed: number | null; splitNumber: number; distance: number }[] = [];

          for (const lap of laps) {
            const splitNumber = lap.lapIndex ?? 1;
            const distance = lap.distance ?? 0;

            kmSplits.push({
              averageSpeed: lap.averageSpeed ?? null,
              splitNumber,
              distance,
            });

            await prisma.activitySplit.upsert({
              where: {
                activityId_splitNumber_splitType: {
                  activityId: dbActivity.id,
                  splitNumber,
                  splitType: "km",
                },
              },
              update: {},
              create: {
                activityId: dbActivity.id,
                splitNumber,
                splitType: "km",
                distance: lap.distance ?? 0,
                duration: lap.duration ?? 0,
                movingDuration: lap.movingDuration ?? null,
                averageSpeed: lap.averageSpeed ?? null,
                maxSpeed: lap.maxSpeed ?? null,
                averageHR: lap.averageHR ? Math.round(lap.averageHR) : null,
                maxHR: lap.maxHR ? Math.round(lap.maxHR) : null,
                averageCadence: lap.averageRunCadence ?? null,
                maxCadence: lap.maxRunCadence ?? null,
                elevationGain: lap.elevationGain ?? null,
                elevationLoss: lap.elevationLoss ?? null,
                averageGCT: lap.groundContactTime ?? null,
                groundContactBalance: lap.groundContactBalance ?? null,
                averageStrideLength: lap.strideLength ?? null,
                averageVerticalOscillation: lap.verticalOscillation ?? null,
                averageVerticalRatio: lap.verticalRatio ?? null,
                averagePower: lap.averagePower ?? null,
              },
            });
          }

          // Calculer et stocker les statistiques d'allure
          if (kmSplits.length >= 2) {
            const paceStats = calculatePaceStats(kmSplits);
            if (paceStats) {
              await prisma.activity.update({
                where: { id: dbActivity.id },
                data: paceStats,
              });
            }
          }
        }

        // Sync intervalles structurés (splitSummaries) depuis getActivity
        try {
          const activityDetail = await client.getActivity({ activityId: Number(raw.activityId) });
          const splitSummaries = activityDetail?.splitSummaries;

          if (Array.isArray(splitSummaries) && splitSummaries.length > 0) {
            // Filtrer les types d'intervalles pertinents (pas les RWD_*)
            const relevantTypes = ["INTERVAL_WARMUP", "INTERVAL_ACTIVE", "INTERVAL_RECOVERY", "INTERVAL_COOLDOWN"];
            const intervals = splitSummaries.filter(
              (s: GarminRaw) => relevantTypes.includes(s.splitType)
            );

            for (let i = 0; i < intervals.length; i++) {
              const interval = intervals[i];
              await prisma.activityInterval.create({
                data: {
                  activityId: dbActivity.id,
                  intervalType: interval.splitType,
                  intervalOrder: i,
                  distance: interval.distance ?? 0,
                  duration: interval.duration ?? 0,
                  noOfSplits: interval.noOfSplits ?? 1,
                  averageSpeed: interval.averageSpeed ?? null,
                  averageHR: interval.averageHR ? Math.round(interval.averageHR) : null,
                  maxHR: interval.maxHR ? Math.round(interval.maxHR) : null,
                  averageCadence: interval.averageRunCadence ?? null,
                  averageGCT: interval.avgGroundContactTime ?? null,
                  averageStrideLength: interval.avgStrideLength ?? null,
                  elevationGain: interval.elevationGain ?? null,
                  elevationLoss: interval.elevationLoss ?? null,
                },
              });
            }
          }
        } catch (e) {
          console.error(`Failed to sync intervals for activity ${raw.activityId}:`, e);
        }
      } catch (e) {
        console.error(`Failed to sync splits for activity ${raw.activityId}:`, e);
      }
    }
  }

  return { synced: rawActivities.length };
}

export async function syncSleepData(days: number = 14) {
  const { user, client } = await getAuthenticatedGarminClient();

  let synced = 0;
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Utiliser la date locale (pas UTC) pour éviter le décalage de timezone
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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

      // Parse sleep timestamps - Garmin returns milliseconds since epoch
      const sleepStart = dto.sleepStartTimestampLocal
        ? new Date(dto.sleepStartTimestampLocal)
        : null;
      const sleepEnd = dto.sleepEndTimestampLocal
        ? new Date(dto.sleepEndTimestampLocal)
        : null;

      await prisma.sleepRecord.upsert({
        where: {
          userId_calendarDate: {
            userId: user.id,
            calendarDate,
          },
        },
        update: {
          sleepStartTimestamp: sleepStart,
          sleepEndTimestamp: sleepEnd,
          totalSleepSeconds: dto.sleepTimeSeconds ?? null,
          deepSleepSeconds: dto.deepSleepSeconds ?? null,
          lightSleepSeconds: dto.lightSleepSeconds ?? null,
          remSleepSeconds: dto.remSleepSeconds ?? null,
          awakeSleepSeconds: dto.awakeSleepSeconds ?? null,
          sleepScore: dto.sleepScores?.overall?.value ?? null,
          sleepQualifier: dto.sleepScores?.overall?.qualifierKey ?? null,
          avgOvernightHRV: sleep.avgOvernightHrv ?? null,
          restingHeartRate: sleep.restingHeartRate ?? null,
          avgSleepStress: dto.avgSleepStress ?? null,
          bodyBatteryChange,
          startBodyBattery,
          endBodyBattery,
        },
        create: {
          userId: user.id,
          calendarDate,
          sleepStartTimestamp: sleepStart,
          sleepEndTimestamp: sleepEnd,
          totalSleepSeconds: dto.sleepTimeSeconds ?? null,
          deepSleepSeconds: dto.deepSleepSeconds ?? null,
          lightSleepSeconds: dto.lightSleepSeconds ?? null,
          remSleepSeconds: dto.remSleepSeconds ?? null,
          awakeSleepSeconds: dto.awakeSleepSeconds ?? null,
          sleepScore: dto.sleepScores?.overall?.value ?? null,
          sleepQualifier: dto.sleepScores?.overall?.qualifierKey ?? null,
          avgOvernightHRV: sleep.avgOvernightHrv ?? null,
          restingHeartRate: sleep.restingHeartRate ?? null,
          avgSleepStress: dto.avgSleepStress ?? null,
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
  const { user, client } = await getAuthenticatedGarminClient();

  // Get user displayName for stress endpoint
  let displayName: string | null = null;
  try {
    const profile = (await client.getUserProfile()) as GarminRaw;
    displayName = profile?.displayName ?? null;
  } catch { /* ignore */ }

  let synced = 0;
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Utiliser la date locale (pas UTC) pour éviter le décalage de timezone
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
      let stressLevel: number | null = null;
      let moderateIntensityMinutes: number | null = null;
      let vigorousIntensityMinutes: number | null = null;

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

      // Fetch daily stress level and intensity minutes from user summary
      if (displayName) {
        try {
          const summaryData = await client.get<GarminRaw>(
            `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${displayName}?calendarDate=${dateStr}`
          );
          if (summaryData?.averageStressLevel != null) {
            stressLevel = summaryData.averageStressLevel;
          } else if (summaryData?.stressLevel != null) {
            stressLevel = summaryData.stressLevel;
          } else if (summaryData?.maxStressLevel != null) {
            stressLevel = summaryData.maxStressLevel;
          }
          // Intensity minutes
          if (summaryData?.moderateIntensityMinutes != null) {
            moderateIntensityMinutes = summaryData.moderateIntensityMinutes;
          }
          if (summaryData?.vigorousIntensityMinutes != null) {
            vigorousIntensityMinutes = summaryData.vigorousIntensityMinutes;
          }
        } catch { /* ignore */ }
      }

      // Only upsert if we have at least some data
      if (restingHR !== null || weight !== null || totalSteps !== null || stressLevel !== null || moderateIntensityMinutes !== null) {
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
            stressLevel,
            moderateIntensityMinutes,
            vigorousIntensityMinutes,
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
            stressLevel,
            moderateIntensityMinutes,
            vigorousIntensityMinutes,
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
  const { user, client } = await getAuthenticatedGarminClient();

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
  const user = await getAuthenticatedUser();

  // Vérifier si des données ont déjà été synchronisées
  const [activityCount, sleepCount, healthCount] = await Promise.all([
    prisma.activity.count({ where: { userId: user.id } }),
    prisma.sleepRecord.count({ where: { userId: user.id } }),
    prisma.healthMetric.count({ where: { userId: user.id } }),
  ]);

  const isFirstSync = activityCount === 0 && sleepCount === 0 && healthCount === 0;

  // Première sync : 180 jours, sinon 28 jours (pour couvrir la période d'intensité d'entraînement)
  const activityCount180Days = 200; // ~200 activités pour couvrir 180 jours
  const activityCount28Days = 30;   // ~30 activités pour couvrir 28 jours
  const syncDays = isFirstSync ? 180 : 28;
  const syncActivitiesCount = isFirstSync ? activityCount180Days : activityCount28Days;

  const results = {
    profile: { synced: false },
    activities: { synced: 0 },
    sleep: { synced: 0 },
    health: { synced: 0 },
    matching: { matched: 0 },
  };

  try {
    results.profile = await syncUserProfile();
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("syncUserProfile failed:", e);
  }

  try {
    results.activities = await syncActivities(syncActivitiesCount);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("syncActivities failed:", e);
  }

  try {
    results.sleep = await syncSleepData(syncDays);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("syncSleepData failed:", e);
  }

  try {
    results.health = await syncHealthMetrics(syncDays);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("syncHealthMetrics failed:", e);
  }

  // Match activities to training plans
  try {
    results.matching = await matchActivitiesToPlans();
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("matchActivitiesToPlans failed:", e);
  }

  // Update last sync timestamp
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSyncAt: new Date() },
    });
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("Failed to update lastSyncAt:", e);
  }

  return results;
}

// Re-synchronise les splits de toutes les activités existantes avec les données enrichies
export async function resyncAllSplits() {
  const { user, client } = await getAuthenticatedGarminClient();

  // Triées par date décroissante (les plus récentes d'abord)
  const activities = await prisma.activity.findMany({
    where: { userId: user.id },
    select: { id: true, garminActivityId: true },
    orderBy: { startTimeLocal: "desc" },
  });

  let synced = 0;
  let errors = 0;

  // Helper pour attendre entre les requêtes (éviter rate limiting)
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (const activity of activities) {
    try {
      // Supprimer les anciens splits et intervalles
      await prisma.activitySplit.deleteMany({
        where: { activityId: activity.id },
      });
      await prisma.activityInterval.deleteMany({
        where: { activityId: activity.id },
      });

      // Récupérer les splits détaillés depuis l'endpoint /splits (lapDTOs)
      const splitsData = await client.get<GarminRaw>(
        `https://connectapi.garmin.com/activity-service/activity/${activity.garminActivityId}/splits`
      );
      const laps = splitsData?.lapDTOs;

      if (Array.isArray(laps) && laps.length > 0) {
        const kmSplits: { averageSpeed: number | null; splitNumber: number; distance: number }[] = [];

        for (const lap of laps) {
          const splitNumber = lap.lapIndex ?? 1;
          const distance = lap.distance ?? 0;

          kmSplits.push({
            averageSpeed: lap.averageSpeed ?? null,
            splitNumber,
            distance,
          });

          await prisma.activitySplit.create({
            data: {
              activityId: activity.id,
              splitNumber,
              splitType: "km",
              distance: lap.distance ?? 0,
              duration: lap.duration ?? 0,
              movingDuration: lap.movingDuration ?? null,
              averageSpeed: lap.averageSpeed ?? null,
              maxSpeed: lap.maxSpeed ?? null,
              averageHR: lap.averageHR ? Math.round(lap.averageHR) : null,
              maxHR: lap.maxHR ? Math.round(lap.maxHR) : null,
              averageCadence: lap.averageRunCadence ?? null,
              maxCadence: lap.maxRunCadence ?? null,
              elevationGain: lap.elevationGain ?? null,
              elevationLoss: lap.elevationLoss ?? null,
              averageGCT: lap.groundContactTime ?? null,
              groundContactBalance: lap.groundContactBalance ?? null,
              averageStrideLength: lap.strideLength ?? null,
              averageVerticalOscillation: lap.verticalOscillation ?? null,
              averageVerticalRatio: lap.verticalRatio ?? null,
              averagePower: lap.averagePower ?? null,
            },
          });
        }

        // Calculer et stocker les statistiques d'allure
        if (kmSplits.length >= 2) {
          const paceStats = calculatePaceStats(kmSplits);
          if (paceStats) {
            await prisma.activity.update({
              where: { id: activity.id },
              data: paceStats,
            });
          }
        }

        synced++;
      }

      // Sync intervalles structurés (splitSummaries) depuis getActivity
      try {
        const activityDetail = await client.getActivity({ activityId: Number(activity.garminActivityId) });
        const splitSummaries = activityDetail?.splitSummaries;

        if (Array.isArray(splitSummaries) && splitSummaries.length > 0) {
          const relevantTypes = ["INTERVAL_WARMUP", "INTERVAL_ACTIVE", "INTERVAL_RECOVERY", "INTERVAL_COOLDOWN"];
          const intervals = splitSummaries.filter(
            (s: GarminRaw) => relevantTypes.includes(s.splitType)
          );

          for (let i = 0; i < intervals.length; i++) {
            const interval = intervals[i];
            await prisma.activityInterval.create({
              data: {
                activityId: activity.id,
                intervalType: interval.splitType,
                intervalOrder: i,
                distance: interval.distance ?? 0,
                duration: interval.duration ?? 0,
                noOfSplits: interval.noOfSplits ?? 1,
                averageSpeed: interval.averageSpeed ?? null,
                averageHR: interval.averageHR ? Math.round(interval.averageHR) : null,
                maxHR: interval.maxHR ? Math.round(interval.maxHR) : null,
                averageCadence: interval.averageRunCadence ?? null,
                averageGCT: interval.avgGroundContactTime ?? null,
                averageStrideLength: interval.avgStrideLength ?? null,
                elevationGain: interval.elevationGain ?? null,
                elevationLoss: interval.elevationLoss ?? null,
              },
            });
          }
        }
      } catch (e) {
        console.error(`Failed to sync intervals for activity ${activity.garminActivityId}:`, e);
      }

      // Délai de 200ms entre chaque activité pour éviter le rate limiting
      await delay(200);
    } catch (e) {
      console.error(`Failed to resync splits for activity ${activity.garminActivityId}:`, e);
      errors++;
      // En cas d'erreur, on attend un peu plus longtemps
      await delay(500);
    }
  }

  return { synced, errors, total: activities.length };
}
