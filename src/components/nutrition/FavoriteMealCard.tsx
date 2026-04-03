"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Trash2 } from "lucide-react";
import { applyFavoriteMeal, deleteFavoriteMeal } from "@/actions/nutrition";
import { Card, Button, Select, AlertBanner } from "@/components/shared";
import type { FavoriteMealData, MealType } from "@/types/nutrition";
import { MEAL_TYPE_LABELS } from "@/types/nutrition";

interface FavoriteMealCardProps {
  favorite: FavoriteMealData;
  onDelete?: () => void;
}

export default function FavoriteMealCard({
  favorite,
  onDelete,
}: FavoriteMealCardProps) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(favorite.mealType);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setApplying(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];
    const result = await applyFavoriteMeal(favorite.id, today, mealType);

    if ("error" in result) {
      setError(result.error);
    } else {
      router.push("/nutrition");
      router.refresh();
    }

    setApplying(false);
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce favori ?")) return;

    setDeleting(true);
    const result = await deleteFavoriteMeal(favorite.id);

    if (result.success) {
      onDelete?.();
      router.refresh();
    } else {
      setError(result.error ?? "Erreur");
    }

    setDeleting(false);
  };

  return (
    <Card padding="md">
      {error && (
        <AlertBanner variant="error" className="mb-3">
          {error}
        </AlertBanner>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
            <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {favorite.name}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {MEAL_TYPE_LABELS[favorite.mealType]} · {favorite.foods.length}{" "}
              aliment{favorite.foods.length > 1 ? "s" : ""} · Utilisé{" "}
              {favorite.usageCount} fois
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Macros */}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <span className="font-medium text-[var(--text-primary)]">
          {favorite.totalCalories} kcal
        </span>
        <span className="text-[var(--text-muted)]">
          P: {favorite.totalProtein.toFixed(0)}g
        </span>
        <span className="text-[var(--text-muted)]">
          G: {favorite.totalCarbs.toFixed(0)}g
        </span>
        <span className="text-[var(--text-muted)]">
          L: {favorite.totalFat.toFixed(0)}g
        </span>
      </div>

      {/* Aliments */}
      <div className="mt-3 text-xs text-[var(--text-muted)]">
        {favorite.foods.map((f) => f.name).join(", ")}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[var(--border-default)]">
        <Select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="flex-1"
        >
          {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Button
          onClick={handleApply}
          loading={applying}
          variant="primary"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter aujourd&apos;hui
        </Button>
      </div>
    </Card>
  );
}
