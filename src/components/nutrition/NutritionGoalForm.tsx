"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Save, AlertCircle, CheckCircle } from "lucide-react";
import {
  calculateMetabolism,
  saveNutritionGoal,
  updateNutritionProfile,
} from "@/actions/nutrition";
import {
  Card,
  Button,
  FormField,
  Input,
  Select,
  AlertBanner,
} from "@/components/shared";
import type { NutritionGoalData, MetabolismResult, Gender } from "@/types/nutrition";

interface NutritionGoalFormProps {
  currentGoal: NutritionGoalData | null;
  userProfile: {
    weight: number | null;
    height: number | null;
    birthDate: Date | null;
    gender: string | null;
  };
}

export default function NutritionGoalForm({
  currentGoal,
  userProfile,
}: NutritionGoalFormProps) {
  const router = useRouter();

  // État du profil
  const [weight, setWeight] = useState(userProfile.weight?.toString() ?? "");
  const [height, setHeight] = useState(userProfile.height?.toString() ?? "");
  const [birthDate, setBirthDate] = useState(
    userProfile.birthDate
      ? userProfile.birthDate.toISOString().split("T")[0]
      : ""
  );
  const [gender, setGender] = useState<Gender | "">(
    (userProfile.gender as Gender) ?? ""
  );

  // État du métabolisme
  const [metabolism, setMetabolism] = useState<MetabolismResult | null>(null);
  const [calculatingMetabolism, setCalculatingMetabolism] = useState(false);

  // État des objectifs
  const [targetCalories, setTargetCalories] = useState(
    currentGoal?.targetCalories?.toString() ?? ""
  );
  const [targetProtein, setTargetProtein] = useState(
    currentGoal?.targetProtein?.toString() ?? ""
  );
  const [targetCarbs, setTargetCarbs] = useState(
    currentGoal?.targetCarbs?.toString() ?? ""
  );
  const [targetFat, setTargetFat] = useState(
    currentGoal?.targetFat?.toString() ?? ""
  );
  const [weeklyWeightGoal, setWeeklyWeightGoal] = useState(
    currentGoal?.weeklyWeightGoal?.toString() ?? "0"
  );

  // États UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Calculer le métabolisme
  const handleCalculateMetabolism = async () => {
    setCalculatingMetabolism(true);
    setError(null);

    // D'abord sauvegarder le profil si modifié
    if (weight && height && birthDate && gender) {
      const profileResult = await updateNutritionProfile({
        weight: parseFloat(weight),
        height: parseFloat(height),
        birthDate,
        gender: gender as Gender,
      });

      if (!profileResult.success) {
        setError(profileResult.error ?? "Erreur de mise à jour du profil");
        setCalculatingMetabolism(false);
        return;
      }
    }

    const result = await calculateMetabolism();

    if ("error" in result) {
      setError(result.error);
    } else {
      setMetabolism(result);
      // Pré-remplir l'objectif calorique avec le TDEE si pas déjà défini
      if (!targetCalories) {
        setTargetCalories(result.tdee.toString());
      }
    }

    setCalculatingMetabolism(false);
  };

  // Ajuster les calories quand l'objectif de poids change
  const handleWeeklyGoalChange = (value: string) => {
    setWeeklyWeightGoal(value);
    if (metabolism) {
      const weeklyGoal = parseFloat(value);
      const dailyAdjustment = Math.round((weeklyGoal * 7700) / 7);
      const adjustedCalories = metabolism.tdee + dailyAdjustment;
      setTargetCalories(Math.max(1200, adjustedCalories).toString());
    }
  };

  // Sauvegarder les objectifs
  const handleSave = async () => {
    if (!targetCalories) {
      setError("L'objectif calorique est requis");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await saveNutritionGoal({
      targetCalories: parseInt(targetCalories),
      targetProtein: targetProtein ? parseInt(targetProtein) : undefined,
      targetCarbs: targetCarbs ? parseInt(targetCarbs) : undefined,
      targetFat: targetFat ? parseInt(targetFat) : undefined,
      weeklyWeightGoal: weeklyWeightGoal
        ? parseFloat(weeklyWeightGoal)
        : undefined,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } else {
      setError(result.error ?? "Erreur lors de la sauvegarde");
    }

    setSaving(false);
  };

  // Calcul automatique des macros
  const handleAutoMacros = () => {
    const w = parseFloat(weight);
    const cal = parseInt(targetCalories);
    if (!w || !cal) {
      setError("Poids et objectif calorique requis pour le calcul automatique");
      return;
    }

    const isWeightLoss = parseFloat(weeklyWeightGoal) < 0;

    // Protéines : 1.6-2.0 g/kg (plus haut si perte de poids pour préserver la masse musculaire)
    const proteinRatio = isWeightLoss ? 2.0 : 1.6;
    const proteinG = Math.round(w * proteinRatio);
    const proteinCal = proteinG * 4;

    // Lipides : 25% des calories totales (min santé)
    const fatCal = Math.round(cal * 0.25);
    const fatG = Math.round(fatCal / 9);

    // Glucides : le reste
    const carbsCal = cal - proteinCal - fatCal;
    const carbsG = Math.max(0, Math.round(carbsCal / 4));

    setTargetProtein(proteinG.toString());
    setTargetFat(fatG.toString());
    setTargetCarbs(carbsG.toString());
  };

  const canAutoMacros = weight && targetCalories;
  const isProfileComplete = weight && height && birthDate && gender;

  return (
    <div className="space-y-6">
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && (
        <AlertBanner variant="info" icon={<CheckCircle className="h-5 w-5" />}>
          Objectifs enregistrés avec succès
        </AlertBanner>
      )}

      {/* Profil utilisateur */}
      <Card padding="md">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">
          Ton profil
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField label="Poids (kg)" htmlFor="weight">
            <Input
              id="weight"
              type="number"
              min="30"
              max="300"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70"
            />
          </FormField>

          <FormField label="Taille (cm)" htmlFor="height">
            <Input
              id="height"
              type="number"
              min="100"
              max="250"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="175"
            />
          </FormField>

          <FormField label="Date de naissance" htmlFor="birthDate">
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </FormField>

          <FormField label="Sexe" htmlFor="gender">
            <Select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
            >
              <option value="">Sélectionner</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </Select>
          </FormField>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleCalculateMetabolism}
            loading={calculatingMetabolism}
            variant="secondary"
            disabled={!isProfileComplete}
          >
            <Calculator className="h-4 w-4 mr-1.5" />
            Calculer mon métabolisme
          </Button>

          {!isProfileComplete && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Complète ton profil pour calculer ton métabolisme
            </p>
          )}
        </div>
      </Card>

      {/* Résultat métabolisme */}
      {metabolism && (
        <Card padding="md" className="bg-green-50 dark:bg-green-950/30">
          <h2 className="font-semibold text-green-800 dark:text-green-200 mb-3">
            Ton métabolisme
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Métabolisme de base (BMR)
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metabolism.bmr} kcal
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Dépense totale (TDEE)
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metabolism.tdee} kcal
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Calories actives (Garmin)
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                +{metabolism.avgActiveCalories} kcal
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Jours de données
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metabolism.daysWithData} j
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-green-700 dark:text-green-300">
            Calculé avec la formule Mifflin-St Jeor + moyenne des calories
            brûlées via Garmin sur 7 jours.
          </p>
        </Card>
      )}

      {/* Objectif de poids */}
      <Card padding="md">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">
          Objectif de poids
        </h2>

        <FormField label="Variation hebdomadaire (kg/semaine)" htmlFor="weeklyWeightGoal">
          <Select
            id="weeklyWeightGoal"
            value={weeklyWeightGoal}
            onChange={(e) => handleWeeklyGoalChange(e.target.value)}
          >
            <option value="-1">Perte rapide (-1 kg/sem)</option>
            <option value="-0.5">Perte modérée (-0.5 kg/sem)</option>
            <option value="-0.25">Perte légère (-0.25 kg/sem)</option>
            <option value="0">Maintien</option>
            <option value="0.25">Prise légère (+0.25 kg/sem)</option>
            <option value="0.5">Prise modérée (+0.5 kg/sem)</option>
          </Select>
        </FormField>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          L&apos;objectif calorique sera ajusté automatiquement.
        </p>
      </Card>

      {/* Objectifs caloriques */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--text-primary)]">
            Objectifs quotidiens
          </h2>
          <Button
            onClick={handleAutoMacros}
            variant="ghost-primary"
            size="sm"
            disabled={!canAutoMacros}
            title={!canAutoMacros ? "Renseigne ton poids et les calories cibles d'abord" : ""}
          >
            <Calculator className="h-4 w-4 mr-1.5" />
            Calcul auto
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField label="Calories (kcal)" htmlFor="targetCalories">
            <Input
              id="targetCalories"
              type="number"
              min="1000"
              max="10000"
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
              placeholder="2000"
            />
          </FormField>

          <FormField label="Protéines (g)" htmlFor="targetProtein">
            <Input
              id="targetProtein"
              type="number"
              min="0"
              max="500"
              value={targetProtein}
              onChange={(e) => setTargetProtein(e.target.value)}
              placeholder="120"
            />
          </FormField>

          <FormField label="Glucides (g)" htmlFor="targetCarbs">
            <Input
              id="targetCarbs"
              type="number"
              min="0"
              max="1000"
              value={targetCarbs}
              onChange={(e) => setTargetCarbs(e.target.value)}
              placeholder="250"
            />
          </FormField>

          <FormField label="Lipides (g)" htmlFor="targetFat">
            <Input
              id="targetFat"
              type="number"
              min="0"
              max="500"
              value={targetFat}
              onChange={(e) => setTargetFat(e.target.value)}
              placeholder="70"
            />
          </FormField>
        </div>

        {targetProtein && targetCarbs && targetFat && targetCalories && (
          <div className="mt-3 text-xs text-[var(--text-muted)]">
            Répartition : protéines {Math.round((parseInt(targetProtein) * 4 / parseInt(targetCalories)) * 100)}%
            {" · "}glucides {Math.round((parseInt(targetCarbs) * 4 / parseInt(targetCalories)) * 100)}%
            {" · "}lipides {Math.round((parseInt(targetFat) * 9 / parseInt(targetCalories)) * 100)}%
          </div>
        )}
      </Card>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={saving}
          variant="primary"
          disabled={!targetCalories}
        >
          <Save className="h-4 w-4 mr-1.5" />
          Enregistrer les objectifs
        </Button>
      </div>
    </div>
  );
}
