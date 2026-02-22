import { Activity } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Activity className="h-8 w-8 text-blue-600" />
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          Stride
        </span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
