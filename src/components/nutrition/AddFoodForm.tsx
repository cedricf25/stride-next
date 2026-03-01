"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import { createMeal, addFoodToMeal } from "@/actions/nutrition";
import {
  Card,
  Button,
  FormField,
  Input,
  Select,
  AlertBanner,
} from "@/components/shared";
import type { FoodInput, MealType } from "@/types/nutrition";
import { MEAL_TYPE_LABELS, FOOD_UNITS } from "@/types/nutrition";

interface AddFoodFormProps {
  date: string;
  defaultMealType?: MealType;
}

const emptyFood: FoodInput = {
  name: "",
  quantity: 100,
  unit: "g",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

export default function AddFoodForm({
  date,
  defaultMealType = "lunch",
}: AddFoodFormProps) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [mealName, setMealName] = useState("");
  const [foods, setFoods] = useState<FoodInput[]>([{ ...emptyFood }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFood = () => {
    setFoods([...foods, { ...emptyFood }]);
  };

  const removeFood = (index: number) => {
    if (foods.length > 1) {
      setFoods(foods.filter((_, i) => i !== index));
    }
  };

  const updateFood = (index: number, field: keyof FoodInput, value: string | number) => {
    const updated = [...foods];
    updated[index] = { ...updated[index], [field]: value };
    setFoods(updated);
  };

  const calculateTotals = () => {
    return foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (Number(food.calories) || 0),
        protein: acc.protein + (Number(food.protein) || 0),
        carbs: acc.carbs + (Number(food.carbs) || 0),
        fat: acc.fat + (Number(food.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Valider qu'au moins un aliment est renseigné
      const validFoods = foods.filter(
        (f) => f.name.trim() && f.calories > 0
      );

      if (validFoods.length === 0) {
        setError("Ajoute au moins un aliment avec un nom et des calories");
        setLoading(false);
        return;
      }

      // Créer le repas
      const mealResult = await createMeal({
        date,
        mealType,
        name: mealName || undefined,
      });

      if ("error" in mealResult) {
        setError(mealResult.error);
        setLoading(false);
        return;
      }

      // Ajouter les aliments
      for (const food of validFoods) {
        const foodResult = await addFoodToMeal(mealResult.mealId, {
          name: food.name,
          quantity: Number(food.quantity),
          unit: food.unit,
          calories: Number(food.calories),
          protein: Number(food.protein),
          carbs: Number(food.carbs),
          fat: Number(food.fat),
        });

        if ("error" in foodResult) {
          console.error("Error adding food:", foodResult.error);
        }
      }

      router.push("/nutrition");
      router.refresh();
    } catch (err) {
      setError("Une erreur est survenue");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {/* Type de repas et nom */}
      <Card padding="md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Type de repas" htmlFor="mealType">
            <Select
              id="mealType"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
            >
              {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Nom du repas"
            htmlFor="mealName"
            labelSuffix="(optionnel)"
          >
            <Input
              id="mealName"
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="ex: Salade César"
            />
          </FormField>
        </div>
      </Card>

      {/* Aliments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Aliments</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addFood}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {foods.map((food, index) => (
          <Card key={index} padding="md">
            <div className="space-y-4">
              {/* Nom et quantité */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Aliment" htmlFor={`food-${index}-name`}>
                  <Input
                    id={`food-${index}-name`}
                    type="text"
                    value={food.name}
                    onChange={(e) => updateFood(index, "name", e.target.value)}
                    placeholder="ex: Poulet grillé"
                    required
                  />
                </FormField>

                <FormField label="Quantité" htmlFor={`food-${index}-quantity`}>
                  <Input
                    id={`food-${index}-quantity`}
                    type="number"
                    min="0"
                    step="1"
                    value={food.quantity}
                    onChange={(e) =>
                      updateFood(index, "quantity", Number(e.target.value))
                    }
                  />
                </FormField>

                <FormField label="Unité" htmlFor={`food-${index}-unit`}>
                  <Select
                    id={`food-${index}-unit`}
                    value={food.unit}
                    onChange={(e) => updateFood(index, "unit", e.target.value)}
                  >
                    {FOOD_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <FormField label="Calories" htmlFor={`food-${index}-calories`}>
                  <Input
                    id={`food-${index}-calories`}
                    type="number"
                    min="0"
                    step="1"
                    value={food.calories}
                    onChange={(e) =>
                      updateFood(index, "calories", Number(e.target.value))
                    }
                    required
                  />
                </FormField>

                <FormField
                  label="Protéines (g)"
                  htmlFor={`food-${index}-protein`}
                >
                  <Input
                    id={`food-${index}-protein`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={food.protein}
                    onChange={(e) =>
                      updateFood(index, "protein", Number(e.target.value))
                    }
                  />
                </FormField>

                <FormField
                  label="Glucides (g)"
                  htmlFor={`food-${index}-carbs`}
                >
                  <Input
                    id={`food-${index}-carbs`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={food.carbs}
                    onChange={(e) =>
                      updateFood(index, "carbs", Number(e.target.value))
                    }
                  />
                </FormField>

                <FormField label="Lipides (g)" htmlFor={`food-${index}-fat`}>
                  <Input
                    id={`food-${index}-fat`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={food.fat}
                    onChange={(e) =>
                      updateFood(index, "fat", Number(e.target.value))
                    }
                  />
                </FormField>
              </div>

              {/* Bouton supprimer */}
              {foods.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeFood(index)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Récapitulatif */}
      <Card padding="md" className="bg-[var(--bg-muted)]">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">
          Récapitulatif
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Calories : </span>
            <span className="font-medium text-[var(--text-primary)]">
              {totals.calories} kcal
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Protéines : </span>
            <span className="font-medium text-[var(--text-primary)]">
              {totals.protein.toFixed(1)}g
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Glucides : </span>
            <span className="font-medium text-[var(--text-primary)]">
              {totals.carbs.toFixed(1)}g
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Lipides : </span>
            <span className="font-medium text-[var(--text-primary)]">
              {totals.fat.toFixed(1)}g
            </span>
          </div>
        </div>
      </Card>

      {/* Bouton submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          <Save className="h-4 w-4 mr-1.5" />
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
