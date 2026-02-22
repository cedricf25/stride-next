"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { fetchGarminActivities } from "@/actions/garmin";
import type { FormattedActivity, ActivityFilters as Filters } from "@/types/garmin";
import ActivityCard from "@/components/ActivityCard";
import ActivityFilters from "./ActivityFilters";
import { EmptyState, Button } from "@/components/shared";

const PAGE_SIZE = 12;

export default function ActivityResults() {
  const [filters, setFilters] = useState<Filters>({});
  const [activities, setActivities] = useState<FormattedActivity[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isInitial, setIsInitial] = useState(true);

  const loadActivities = useCallback(
    (pageNum: number, currentFilters: Filters, append: boolean) => {
      startTransition(async () => {
        const { activities: results } = await fetchGarminActivities(
          pageNum,
          PAGE_SIZE,
          currentFilters
        );
        if (results.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);

        if (append) {
          setActivities((prev) => [...prev, ...results]);
          setTotal((prev) => (prev ?? 0) + results.length);
        } else {
          setActivities(results);
          setTotal(results.length);
        }
        setIsInitial(false);
      });
    },
    []
  );

  // Initial load
  useEffect(() => {
    loadActivities(0, filters, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiltersChange(newFilters: Filters) {
    setFilters(newFilters);
    setPage(0);
    setHasMore(true);
    loadActivities(0, newFilters, false);
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadActivities(nextPage, filters, true);
  }

  return (
    <>
      <ActivityFilters filters={filters} onChange={handleFiltersChange} />

      {total !== null && (
        <p className="mb-4 text-sm text-[var(--text-tertiary)]">
          {total === 0
            ? "Aucune activité trouvée"
            : `${total} activité${total > 1 ? "s" : ""}`}
          {hasMore && total !== null && total > 0 && "+"}
        </p>
      )}

      {activities.length === 0 && !isPending && !isInitial ? (
        <EmptyState
          variant="dashed"
          icon={<Activity className="h-10 w-10" />}
          message="Aucune activité trouvée"
          subtitle="Essaie de modifier tes filtres"
        />
      ) : (
        <div
          className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${
            isPending ? "opacity-60" : ""
          }`}
        >
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {hasMore && activities.length > 0 && (
        <div className="mt-6 text-center">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={isPending}
            icon={
              <ChevronDown
                className={`h-4 w-4 ${isPending ? "animate-bounce" : ""}`}
              />
            }
          >
            {isPending ? "Chargement..." : "Voir plus"}
          </Button>
        </div>
      )}
    </>
  );
}
