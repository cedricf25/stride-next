import { DatabaseZap } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { checkDbConnection } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbOk = await checkDbConnection();

  if (!dbOk) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <DatabaseZap className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-lg font-bold text-gray-900">
            Base de données inaccessible
          </h1>
          <p className="mt-2 text-sm text-gray-500">
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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
