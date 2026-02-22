"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Mode sombre
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          Adapter l&apos;interface pour un environnement sombre
        </p>
      </div>
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          theme === "dark" ? "bg-blue-600" : "bg-[var(--bg-subtle)]"
        }`}
        aria-label="Basculer le mode sombre"
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white transition-transform ${
            theme === "dark" ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        >
          {theme === "dark" ? (
            <Moon className="h-3 w-3 text-blue-600" />
          ) : (
            <Sun className="h-3 w-3 text-[var(--text-muted)]" />
          )}
        </span>
      </button>
    </div>
  );
}
