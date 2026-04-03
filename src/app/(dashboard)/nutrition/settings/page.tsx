import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchNutritionGoal } from "@/actions/nutrition";
import { getAuthenticatedUser } from "@/lib/user";
import { PageContainer } from "@/components/shared";
import NutritionGoalForm from "@/components/nutrition/NutritionGoalForm";

export const dynamic = "force-dynamic";

export default async function NutritionSettingsPage() {
  const [user, currentGoal] = await Promise.all([
    getAuthenticatedUser(),
    fetchNutritionGoal(),
  ]);

  const userProfile = {
    weight: user.weight,
    height: user.height,
    birthDate: user.birthDate,
    gender: user.gender,
  };

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
          Objectifs nutritionnels
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Configure ton métabolisme et tes objectifs caloriques
        </p>
      </div>

      {/* Formulaire */}
      <NutritionGoalForm currentGoal={currentGoal} userProfile={userProfile} />
    </PageContainer>
  );
}
