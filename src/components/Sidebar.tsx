"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Heart, Target, Timer, List } from "lucide-react";
import SyncButton from "./SyncButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/dashboard/activities", label: "Activités", icon: List },
  { href: "/dashboard/health", label: "Santé", icon: Heart },
  { href: "/dashboard/training", label: "Entraînement", icon: Target },
  { href: "/dashboard/predictions", label: "Prédictions", icon: Timer },
];

export default function Sidebar({ lastSyncAt }: { lastSyncAt: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-5">
        <Activity className="h-6 w-6 text-blue-600" />
        <span className="text-lg font-bold text-gray-900">Stride</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sync button */}
      <div className="border-t border-gray-200 px-3 py-3">
        <SyncButton lastSyncAt={lastSyncAt} />
      </div>
    </aside>
  );
}
