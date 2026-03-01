"use client";

import { Menu, Activity } from "lucide-react";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";

export default function MobileHeader() {
  const { open } = useMobileSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 md:hidden">
      <button
        onClick={open}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-[var(--text-primary)]">Stride</span>
      </div>
      <div className="w-11" />
    </header>
  );
}
