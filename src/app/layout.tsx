import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DatabaseZap } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { checkDbConnection } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stride Dashboard",
  description: "Dashboard de course à pied avec Garmin et Gemini AI",
};

const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem("stride-theme"));if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbOk = await checkDbConnection();

  if (!dbOk) {
    return (
      <html lang="fr" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className={`${inter.className} antialiased`}>
          <div className="flex h-screen items-center justify-center p-8">
            <div className="max-w-md rounded-2xl border border-red-200 bg-[var(--bg-surface)] p-8 text-center shadow-sm">
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
        </body>
      </html>
    );
  }

  const user = await getOrCreateUser();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen">
          <Sidebar lastSyncAt={user.lastSyncAt?.toISOString() ?? null} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
