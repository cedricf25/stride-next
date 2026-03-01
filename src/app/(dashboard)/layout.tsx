import { DatabaseZap } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { MobileSidebarProvider } from "@/contexts/MobileSidebarContext";
import { checkDbConnection } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbOk = await checkDbConnection();

  if (!dbOk) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="max-w-md rounded-2xl border border-red-200 bg-[var(--bg-surface)] p-6 text-center shadow-sm md:p-8">
          <DatabaseZap className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            Base de données inaccessible
          </h1>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Le conteneur MariaDB ne semble pas démarré. Lance-le puis
            rafraîchis la page.
          </p>
          <pre className="mt-4 rounded-lg bg-gray-900 px-4 py-3 text-left text-xs text-gray-300">
            docker start stride-mariadb
          </pre>
        </div>
      </div>
    );
  }

  const user = await getAuthenticatedUser();

  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar lastSyncAt={user.lastSyncAt?.toISOString() ?? null} />
        <div className="flex flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
