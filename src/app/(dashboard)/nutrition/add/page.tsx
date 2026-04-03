import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared";
import AddFoodForm from "@/components/nutrition/AddFoodForm";

export const dynamic = "force-dynamic";

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function AddMealPage() {
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
          Ajouter un repas
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Renseigne les aliments de ton repas
        </p>
      </div>

      {/* Formulaire */}
      <AddFoodForm date={todayStr} />
    </PageContainer>
  );
}
