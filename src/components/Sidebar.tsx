"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Heart, Target, Timer, List, Settings } from "lucide-react";
import SyncButton from "./SyncButton";

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/activities", label: "Activités", icon: List },
  { href: "/health", label: "Santé", icon: Heart },
  { href: "/training", label: "Entraînement", icon: Target },
  { href: "/predictions", label: "Prédictions", icon: Timer },
];

export default function Sidebar({ lastSyncAt }: { lastSyncAt: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-5 py-5">
        <Activity className="h-6 w-6 text-blue-600" />
        <span className="text-lg font-bold text-[var(--text-primary)]">Stride</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-blue-50 text-blue-700"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Settings className="h-5 w-5" />
          Paramètres
        </Link>
      </div>

      {/* Sync button */}
      <div className="border-t border-[var(--border-default)] px-3 py-3">
        <SyncButton lastSyncAt={lastSyncAt} />
      </div>
    </aside>
  );
}
