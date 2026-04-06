"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedGarminClient } from "@/lib/user";

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
          ) as GarminRaw[];

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
