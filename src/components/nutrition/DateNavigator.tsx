"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function DateNavigator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const todayStr = getTodayStr();
  const currentDate = searchParams.get("date") ?? todayStr;
  const isToday = currentDate === todayStr;
  const isFuture = currentDate >= todayStr;

  function navigate(dateStr: string) {
    if (dateStr === todayStr) {
      router.push("/nutrition");
    } else {
      router.push(`/nutrition?date=${dateStr}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Flèche gauche */}
      <button
        onClick={() => navigate(shiftDate(currentDate, -1))}
        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        aria-label="Jour précédent"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Date */}
      <span className="text-sm font-medium text-[var(--text-primary)] capitalize min-w-[180px] text-center">
        {isToday ? "Aujourd'hui" : formatDateFr(currentDate)}
      </span>

      {/* Flèche droite */}
      <button
        onClick={() => navigate(shiftDate(currentDate, 1))}
        disabled={isFuture}
        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        aria-label="Jour suivant"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Bouton Aujourd'hui */}
      {!isToday && (
        <button
          onClick={() => navigate(todayStr)}
          className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
        >
          <CalendarDays className="h-3 w-3" />
          Aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
