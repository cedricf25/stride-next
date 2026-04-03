import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { fetchFavoriteMeals } from "@/actions/nutrition";
import { PageContainer, EmptyState } from "@/components/shared";
import FavoriteMealCard from "@/components/nutrition/FavoriteMealCard";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const favorites = await fetchFavoriteMeals();

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
          Repas favoris
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Réutilise rapidement tes repas enregistrés
        </p>
      </div>

      {/* Liste des favoris */}
      {favorites.length > 0 ? (
        <div className="space-y-4">
          {favorites.map((favorite) => (
            <FavoriteMealCard key={favorite.id} favorite={favorite} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucun favori"
          message="Enregistre un repas comme favori pour le retrouver ici"
          icon={<Heart className="h-10 w-10" />}
          variant="dashed"
        >
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Tu peux sauvegarder un repas en favori depuis le journal quotidien.
          </p>
        </EmptyState>
      )}
    </PageContainer>
  );
}
