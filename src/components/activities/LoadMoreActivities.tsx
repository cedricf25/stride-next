"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import type { FormattedActivity } from "@/types/garmin";
import ActivityCard from "@/components/ActivityCard";

interface Props {
  initialPage: number;
  pageSize: number;
}

export default function LoadMoreActivities({ initialPage, pageSize }: Props) {
  const [activities, setActivities] = useState<FormattedActivity[]>([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const { activities: more } = await fetchGarminActivities(page, pageSize);
      if (more.length < pageSize) setHasMore(false);
      setActivities((prev) => [...prev, ...more]);
      setPage((p) => p + 1);
    });
  }

  return (
    <>
      {activities.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronDown
              className={`h-4 w-4 ${isPending ? "animate-bounce" : ""}`}
            />
            {isPending ? "Chargement..." : "Voir plus"}
          </button>
        </div>
      )}
    </>
  );
}
