"use client";

import { LogOut, User } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {session.user.name ?? "Utilisateur"}
        </p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {session.user.email}
        </p>
      </div>
      <button
        onClick={async () => {
          await signOut();
          router.push("/login");
          router.refresh();
        }}
        className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
