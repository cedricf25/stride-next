import Link from "next/link";
import { fetchSleepHistory, fetchHealthHistory } from "@/actions/health";
import SleepChart from "@/components/health/SleepChart";
import HrvChart from "@/components/health/HrvChart";
import StressChart from "@/components/health/StressChart";
import RestingHRChart from "@/components/health/RestingHRChart";
import WeightChart from "@/components/health/WeightChart";
import StepsChart from "@/components/health/StepsChart";
import BodyBatteryCard from "@/components/health/BodyBatteryCard";
import { PageContainer } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [sleepData, healthData] = await Promise.all([
    fetchSleepHistory(30),
    fetchHealthHistory(30),
  ]);

  const latestSleep = sleepData[sleepData.length - 1] ?? null;

  const cards = [
    { href: "/health/sleep", component: <SleepChart data={sleepData} /> },
    { href: "/health/hrv", component: <HrvChart data={sleepData} /> },
    { href: "/health/stress", component: <StressChart data={sleepData} /> },
    { href: "/health/heart-rate", component: <RestingHRChart data={healthData} /> },
    { href: "/health/weight", component: <WeightChart data={healthData} /> },
    { href: "/health/steps", component: <StepsChart data={healthData} /> },
    { href: "/health/body-battery", component: <BodyBatteryCard data={latestSleep} /> },
  ];

  return (
    <PageContainer>
      <h1 className="mb-4 text-xl font-bold text-[var(--text-primary)] md:mb-6 md:text-2xl">Santé</h1>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block transition-shadow hover:shadow-md rounded-xl"
          >
            {card.component}
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
