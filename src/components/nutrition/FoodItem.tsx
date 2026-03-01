import { Trash2, Sparkles } from "lucide-react";
import type { FoodItem as FoodItemType } from "@/types/nutrition";

interface FoodItemProps {
  food: FoodItemType;
  onRemove?: (foodId: string) => void;
  showRemove?: boolean;
}

export default function FoodItem({
  food,
  onRemove,
  showRemove = false,
}: FoodItemProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)] truncate">
            {food.name}
          </span>
          {food.source === "ai_vision" && (
            <span
              className="flex items-center gap-0.5 text-xs text-purple-600 dark:text-purple-400"
              title={`Confiance IA : ${food.confidence ?? "N/A"}%`}
            >
              <Sparkles className="h-3 w-3" />
              {food.confidence && <span>{food.confidence}%</span>}
            </span>
          )}
        </div>
        <div className="text-sm text-[var(--text-muted)]">
          {food.quantity} {food.unit}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-semibold text-[var(--text-primary)]">
            {food.calories} kcal
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            P: {food.protein.toFixed(0)}g · G: {food.carbs.toFixed(0)}g · L:{" "}
            {food.fat.toFixed(0)}g
          </div>
        </div>

        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(food.id)}
            className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
