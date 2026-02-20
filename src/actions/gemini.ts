"use server";

import { GoogleGenAI } from "@google/genai";
import type { GarminActivity, AnalysisResponse } from "@/types/garmin";

const SYSTEM_PROMPT = `Tu es un coach expert en course à pied. Analyse les données d'entraînement suivantes et fournis :

1. **Résumé général** : Vue d'ensemble des performances récentes
2. **Analyse de l'allure** : Commentaires sur les rythmes de course
3. **Fréquence cardiaque** : Analyse des zones cardiaques et de l'effort
4. **Progression** : Tendances observées entre les séances
5. **Recommandations** : Conseils personnalisés pour progresser

Sois concis, encourageant et utilise des données précises dans ton analyse.
Réponds en français.`;

export async function analyzeActivitiesWithGemini(
  rawActivities: GarminActivity[]
): Promise<AnalysisResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY must be set in .env.local");
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Voici les données de mes 5 dernières courses :\n\n${JSON.stringify(rawActivities, null, 2)}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const analysis = response.text ?? "";

    return { analysis };
  } catch (error) {
    console.error("Error analyzing with Gemini:", error);
    return {
      analysis: "",
      error:
        error instanceof Error
          ? error.message
          : "Failed to analyze activities with Gemini",
    };
  }
}
