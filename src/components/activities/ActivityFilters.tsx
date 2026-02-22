"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ArrowUpDown, X } from "lucide-react";
import type { ActivityFilters as Filters } from "@/types/garmin";

const PERIODS = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "year", label: "Cette année" },
  { value: "all", label: "Tout" },
] as const;

const DISTANCES = [
  { label: "< 5 km", min: undefined, max: 5000 },
  { label: "5–10 km", min: 5000, max: 10000 },
  { label: "10–21 km", min: 10000, max: 21100 },
  { label: "> 21 km", min: 21100, max: undefined },
] as const;

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "distance", label: "Distance" },
  { value: "pace", label: "Allure" },
  { value: "duration", label: "Durée" },
] as const;

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function ActivityFilters({ filters, onChange }: Props) {
  const [search, setSearch] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        onChange({ ...filters, search: search || undefined });
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPeriod(period: Filters["period"]) {
    onChange({
      ...filters,
      period: filters.period === period ? undefined : period,
    });
  }

  function setDistance(min?: number, max?: number) {
    const same =
      filters.distanceMin === min && filters.distanceMax === max;
    onChange({
      ...filters,
      distanceMin: same ? undefined : min,
      distanceMax: same ? undefined : max,
    });
  }

  function setSort(sortBy: Filters["sortBy"]) {
    if (filters.sortBy === sortBy) {
      onChange({
        ...filters,
        sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
      });
    } else {
      onChange({ ...filters, sortBy, sortOrder: "desc" });
    }
  }

  const hasActiveFilters =
    filters.search ||
    filters.period ||
    filters.distanceMin != null ||
    filters.distanceMax != null;

  function clearFilters() {
    setSearch("");
    onChange({ sortBy: filters.sortBy, sortOrder: filters.sortOrder });
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une activité..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Period + Distance + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period chips */}
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.period === p.value
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="mx-1 h-4 w-px bg-gray-300" />

        {/* Distance chips */}
        {DISTANCES.map((d) => {
          const active =
            filters.distanceMin === d.min && filters.distanceMax === d.max;
          return (
            <button
              key={d.label}
              onClick={() => setDistance(d.min, d.max)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {d.label}
            </button>
          );
        })}

        <div className="mx-1 h-4 w-px bg-gray-300" />

        {/* Sort buttons */}
        {SORT_OPTIONS.map((s) => {
          const active = (filters.sortBy ?? "date") === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setSort(s.value as Filters["sortBy"])}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {active && (
                <ArrowUpDown className="h-3 w-3" />
              )}
              {s.label}
              {active && (
                <span className="text-[10px]">
                  {(filters.sortOrder ?? "desc") === "desc" ? "↓" : "↑"}
                </span>
              )}
            </button>
          );
        })}

        {/* Clear filters */}
        {hasActiveFilters && (
          <>
            <div className="mx-1 h-4 w-px bg-gray-300" />
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <X className="h-3 w-3" />
              Effacer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
