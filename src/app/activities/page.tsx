import { Activity } from "lucide-react";
import ActivityResults from "@/components/activities/ActivityResults";
import { PageContainer } from "@/components/shared";

export const dynamic = "force-dynamic";

export default function ActivitiesPage() {
  return (
    <PageContainer>
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold text-[var(--text-primary)]">
        <Activity className="h-7 w-7 text-blue-600" />
        Toutes les activités
      </h1>

      <ActivityResults />
    </PageContainer>
  );
}
