"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Heart, Target, Timer, List, Settings, X, UtensilsCrossed } from "lucide-react";
import SyncButton from "./SyncButton";
import UserMenu from "./UserMenu";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/activities", label: "Activités", icon: List },
  { href: "/health", label: "Santé", icon: Heart },
  { href: "/training", label: "Entraînement", icon: Target },
  { href: "/predictions", label: "Prédictions", icon: Timer },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
];

export default function Sidebar({ lastSyncAt }: { lastSyncAt: string | null }) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 flex-col
          border-r border-[var(--border-default)] bg-[var(--bg-surface)]
          transform transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header with close button on mobile */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-5">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-[var(--text-primary)]">Stride</span>
          </div>
          <button
            onClick={close}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="border-t border-[var(--border-default)] px-3 py-2">
          <Link
            href="/settings"
            onClick={close}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
              pathname === "/settings"
                ? "bg-blue-50 text-blue-700"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Settings className="h-5 w-5" />
            Paramètres
          </Link>
        </div>

        {/* User menu */}
        <div className="border-t border-[var(--border-default)]">
          <UserMenu />
        </div>

        {/* Sync button */}
        <div className="border-t border-[var(--border-default)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <SyncButton lastSyncAt={lastSyncAt} />
        </div>
      </aside>
    </>
  );
}
