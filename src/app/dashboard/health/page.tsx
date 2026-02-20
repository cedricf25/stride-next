import { fetchSleepHistory, fetchHealthHistory } from "@/actions/health";
import SleepChart from "@/components/health/SleepChart";
import HrvChart from "@/components/health/HrvChart";
import RestingHRChart from "@/components/health/RestingHRChart";
import WeightChart from "@/components/health/WeightChart";
import StepsChart from "@/components/health/StepsChart";
import BodyBatteryCard from "@/components/health/BodyBatteryCard";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [sleepData, healthData] = await Promise.all([
    fetchSleepHistory(30),
    fetchHealthHistory(30),
  ]);

  const latestSleep = sleepData[sleepData.length - 1] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Santé</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SleepChart data={sleepData} />
        <HrvChart data={sleepData} />
        <RestingHRChart data={healthData} />
        <WeightChart data={healthData} />
        <StepsChart data={healthData} />
        <BodyBatteryCard data={latestSleep} />
      </div>
    </div>
  );
}
