"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Heart, Trash2 } from "lucide-react";
import { Card } from "@/components/shared";
import FoodItem from "./FoodItem";
import type { MealWithFoods } from "@/types/nutrition";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from "@/types/nutrition";

interface MealCardProps {
  meal: MealWithFoods;
  onRemoveFood?: (foodId: string) => void;
  onDeleteMeal?: (mealId: string) => void;
  onSaveFavorite?: (mealId: string) => void;
  editable?: boolean;
}

export default function MealCard({
  meal,
  onRemoveFood,
  onDeleteMeal,
  onSaveFavorite,
  editable = false,
}: MealCardProps) {
  const [expanded, setExpanded] = useState(true);

  const mealLabel = MEAL_TYPE_LABELS[meal.mealType];
  const mealIcon = MEAL_TYPE_ICONS[meal.mealType];

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{mealIcon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-[var(--text-primary)]">
              {meal.name ?? mealLabel}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {meal.foods.length} aliment{meal.foods.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-bold text-lg text-[var(--text-primary)]">
              {meal.totalCalories} kcal
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              P: {meal.totalProtein.toFixed(0)}g · G:{" "}
              {meal.totalCarbs.toFixed(0)}g · L: {meal.totalFat.toFixed(0)}g
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {/* Barres macros du repas */}
      {meal.foods.length > 0 && (() => {
        const maxValue = Math.max(meal.totalProtein, meal.totalCarbs, meal.totalFat);
        if (maxValue === 0) return null;
        const bars = [
          { value: meal.totalProtein, color: "bg-blue-500", label: "P" },
          { value: meal.totalCarbs, color: "bg-green-500", label: "G" },
          { value: meal.totalFat, color: "bg-yellow-500", label: "L" },
        ];
        return (
          <div className="flex gap-1 px-4 pb-2">
            {bars.map((bar) => (
              <div
                key={bar.label}
                className="flex-1 h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden"
                title={`${bar.label}: ${bar.value.toFixed(0)}g`}
              >
                <div
                  className={`h-full rounded-full ${bar.color}`}
                  style={{ width: `${(bar.value / maxValue) * 100}%` }}
                />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Content */}
      {expanded && (
        <div className="border-t border-[var(--border-default)]">
          {/* Photos des aliments (dédupliquées) + photo legacy du repas */}
          {(() => {
            const foodImages = meal.foods
              .filter((f) => f.imageData)
              .reduce<{ data: string; mime: string }[]>((acc, f) => {
                if (!acc.some((img) => img.data === f.imageData)) {
                  acc.push({ data: f.imageData!, mime: f.imageMimeType ?? "image/jpeg" });
                }
                return acc;
              }, []);
            // Fallback : photo legacy sur le meal
            if (foodImages.length === 0 && meal.imageData) {
              foodImages.push({ data: meal.imageData, mime: meal.imageMimeType ?? "image/jpeg" });
            }
            if (foodImages.length === 0) return null;
            return (
              <div className="p-4 border-b border-[var(--border-default)]">
                <div className={`flex gap-3 ${foodImages.length > 1 ? "overflow-x-auto" : ""}`}>
                  {foodImages.map((img, i) => (
                    <div key={i} className="relative aspect-video max-w-sm min-w-[200px] rounded-lg overflow-hidden bg-[var(--bg-muted)] flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${img.mime};base64,${img.data}`}
                        alt={`Photo du repas ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Liste des aliments */}
          <div className="px-4">
            {meal.foods.length > 0 ? (
              meal.foods.map((food) => (
                <FoodItem
                  key={food.id}
                  food={food}
                  onRemove={onRemoveFood}
                  showRemove={editable}
                />
              ))
            ) : (
              <p className="py-4 text-center text-[var(--text-muted)] text-sm">
                Aucun aliment ajouté
              </p>
            )}
          </div>

          {/* Actions */}
          {editable && (
            <div className="flex items-center justify-end gap-2 p-3 border-t border-[var(--border-default)] bg-[var(--bg-muted)]">
              {meal.foods.length > 0 && onSaveFavorite && (
                <button
                  onClick={() => onSaveFavorite(meal.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950 rounded-lg transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  <span>Favori</span>
                </button>
              )}
              {onDeleteMeal && (
                <button
                  onClick={() => onDeleteMeal(meal.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
