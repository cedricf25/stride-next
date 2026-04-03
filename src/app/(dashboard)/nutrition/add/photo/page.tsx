import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared";
import PhotoUpload from "@/components/nutrition/PhotoUpload";

export const dynamic = "force-dynamic";

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function PhotoAnalysisPage() {
  const todayStr = getTodayDateString();

  return (
    <PageContainer maxWidth="2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/nutrition"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <h1 className="text-xl font-bold text-[var(--text-primary)] md:text-2xl">
          Analyser une photo
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Prends en photo ton assiette et l&apos;IA estimera les calories
        </p>
      </div>

      {/* Composant upload + analyse */}
      <PhotoUpload date={todayStr} />
    </PageContainer>
  );
}
