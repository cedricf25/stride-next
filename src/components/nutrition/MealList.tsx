"use client";

import { useRouter } from "next/navigation";
import { deleteMeal, removeFood } from "@/actions/nutrition";
import MealCard from "./MealCard";
import type { MealWithFoods } from "@/types/nutrition";

interface MealListProps {
  meals: MealWithFoods[];
}

export default function MealList({ meals }: MealListProps) {
  const router = useRouter();

  const handleDeleteMeal = async (mealId: string) => {
    const result = await deleteMeal(mealId);
    if (result.success) {
      router.refresh();
    }
  };

  const handleRemoveFood = async (foodId: string) => {
    const result = await removeFood(foodId);
    if (result.success) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          editable
          onDeleteMeal={handleDeleteMeal}
          onRemoveFood={handleRemoveFood}
        />
      ))}
    </div>
  );
}
