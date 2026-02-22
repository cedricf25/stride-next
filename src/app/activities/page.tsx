import { Activity } from "lucide-react";
import ActivityResults from "@/components/activities/ActivityResults";

export const dynamic = "force-dynamic";

export default function ActivitiesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900">
        <Activity className="h-7 w-7 text-blue-600" />
        Toutes les activités
      </h1>

      <ActivityResults />
    </div>
  );
}
