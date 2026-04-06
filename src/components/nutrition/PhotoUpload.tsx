"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, Sparkles, Save, Edit3 } from "lucide-react";
import { analyzePhoto, createMealFromPhoto } from "@/actions/nutrition-ai";
import {
  Card,
  Button,
  AlertBanner,
  FormField,
  Input,
  Select,
} from "@/components/shared";
import type { FoodInput, MealType, PhotoAnalysisResult } from "@/types/nutrition";
import { MEAL_TYPE_LABELS, FOOD_UNITS } from "@/types/nutrition";

interface PhotoUploadProps {
  date: string;
  defaultMealType?: MealType;
}

export default function PhotoUpload({
  date,
  defaultMealType = "lunch",
}: PhotoUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageData, setImageData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] =
    useState<PhotoAnalysisResult | null>(null);
  const [editableFoods, setEditableFoods] = useState<FoodInput[]>([]);

  // Compresser et redimensionner l'image pour l'analyse IA
  const compressImage = useCallback(
    (file: File): Promise<{ base64: string; mime: string }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 1280;
          let { width, height } = img;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve({
            base64: dataUrl.split(",")[1],
            mime: "image/jpeg",
          });
        };
        img.onerror = () => reject(new Error("Impossible de lire l'image"));
        img.src = URL.createObjectURL(file);
      });
    },
    []
  );

  // Gestion de l'upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (max 10MB avant compression)
    if (file.size > 10 * 1024 * 1024) {
      setError("L'image est trop grande (max 10 Mo)");
      return;
    }

    // Vérifier le type
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image");
      return;
    }

    setError(null);

    try {
      const { base64, mime } = await compressImage(file);
      setMimeType(mime);
      setImageData(base64);
      setAnalysisResult(null);
      setEditableFoods([]);
    } catch {
      setError("Erreur lors du traitement de l'image");
    }
  };

  const clearImage = () => {
    setImageData(null);
    setAnalysisResult(null);
    setEditableFoods([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Analyse IA
  const handleAnalyze = async () => {
    if (!imageData) return;

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzePhoto(imageData, mimeType);

      if ("error" in result) {
        setError(result.error);
      } else {
        setAnalysisResult(result);
        setEditableFoods(
          result.foods.map((f) => ({
            ...f,
            source: "ai_vision" as const,
          }))
        );
      }
    } catch (err) {
      setError("Erreur lors de l'analyse");
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Modification des aliments
  const updateFood = (
    index: number,
    field: keyof FoodInput,
    value: string | number
  ) => {
    const updated = [...editableFoods];
    updated[index] = { ...updated[index], [field]: value };
    setEditableFoods(updated);
  };

  const removeFood = (index: number) => {
    setEditableFoods(editableFoods.filter((_, i) => i !== index));
  };

  // Sauvegarde
  const handleSave = async () => {
    if (!imageData || editableFoods.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const result = await createMealFromPhoto(
        date,
        mealType,
        imageData,
        mimeType,
        editableFoods
      );

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push("/nutrition");
        router.refresh();
      }
    } catch (err) {
      setError("Erreur lors de la sauvegarde");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {/* Zone d'upload */}
      {!imageData ? (
        <Card padding="lg">
          <div
            className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[var(--border-default)] rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-12 w-12 text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-primary)] font-medium mb-1">
              Prends une photo de ton repas
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              ou clique pour sélectionner une image
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </Card>
      ) : (
        <>
          {/* Preview de l'image */}
          <Card padding="md">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${mimeType};base64,${imageData}`}
                alt="Photo du repas"
                className="w-full max-h-80 object-contain rounded-lg"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Type de repas */}
            <div className="mt-4">
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
            </div>

            {/* Bouton analyser */}
            {!analysisResult && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleAnalyze}
                  loading={analyzing}
                  variant="primary"
                  size="lg"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {analyzing ? "Analyse en cours..." : "Analyser avec l'IA"}
                </Button>
              </div>
            )}
          </Card>

          {/* Résultats de l'analyse */}
          {analysisResult && (
            <>
              {/* Description IA */}
              {analysisResult.analysis && (
                <Card padding="md" className="bg-purple-50 dark:bg-purple-950/30">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                        Analyse IA
                      </p>
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        {analysisResult.analysis}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Liste des aliments détectés */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-[var(--text-primary)]">
                    Aliments détectés ({editableFoods.length})
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                    <Edit3 className="h-4 w-4" />
                    <span>Modifiable</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {editableFoods.map((food, index) => (
                    <Card key={index} padding="sm">
                      <div className="space-y-3">
                        {/* Nom et confiance */}
                        <div className="flex items-center justify-between">
                          <Input
                            type="text"
                            value={food.name}
                            onChange={(e) =>
                              updateFood(index, "name", e.target.value)
                            }
                            className="font-medium"
                          />
                          {food.confidence && (
                            <span className="ml-2 text-xs text-purple-600 dark:text-purple-400 whitespace-nowrap">
                              {food.confidence}% confiance
                            </span>
                          )}
                        </div>

                        {/* Quantité et macros */}
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">
                              Qté
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={food.quantity}
                              onChange={(e) =>
                                updateFood(
                                  index,
                                  "quantity",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">
                              Unité
                            </label>
                            <Select
                              value={food.unit}
                              onChange={(e) =>
                                updateFood(index, "unit", e.target.value)
                              }
                            >
                              {FOOD_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">
                              kcal
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={food.calories}
                              onChange={(e) =>
                                updateFood(
                                  index,
                                  "calories",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">
                              P (g)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={food.protein}
                              onChange={(e) =>
                                updateFood(
                                  index,
                                  "protein",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">
                              G (g)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={food.carbs}
                              onChange={(e) =>
                                updateFood(
                                  index,
                                  "carbs",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">
                              L (g)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={food.fat}
                              onChange={(e) =>
                                updateFood(
                                  index,
                                  "fat",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Supprimer */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeFood(index)}
                            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Récapitulatif et sauvegarde */}
              <Card padding="md" className="bg-[var(--bg-muted)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      Total :{" "}
                      {editableFoods.reduce((sum, f) => sum + f.calories, 0)}{" "}
                      kcal
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      P:{" "}
                      {editableFoods
                        .reduce((sum, f) => sum + f.protein, 0)
                        .toFixed(0)}
                      g · G:{" "}
                      {editableFoods
                        .reduce((sum, f) => sum + f.carbs, 0)
                        .toFixed(0)}
                      g · L:{" "}
                      {editableFoods
                        .reduce((sum, f) => sum + f.fat, 0)
                        .toFixed(0)}
                      g
                    </p>
                  </div>
                  <Button
                    onClick={handleSave}
                    loading={saving}
                    variant="primary"
                    disabled={editableFoods.length === 0}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Enregistrer le repas
                  </Button>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
