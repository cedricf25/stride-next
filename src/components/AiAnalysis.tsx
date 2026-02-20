"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeActivitiesWithGemini } from "@/actions/gemini";
import type { GarminActivity } from "@/types/garmin";

interface AiAnalysisProps {
  rawActivities: GarminActivity[];
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '<p class="mb-3"></p>');
}

export default function AiAnalysis({ rawActivities }: AiAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setAnalysis("");

    const result = await analyzeActivitiesWithGemini(rawActivities);

    if (result.error) {
      setError(result.error);
    } else {
      setAnalysis(result.analysis);
    }

    setLoading(false);
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Analyse IA
        </h2>
        <button
          onClick={handleAnalyze}
          disabled={loading || rawActivities.length === 0}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyse en cours..." : "Analyser mes courses"}
        </button>
      </div>

      {loading && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div
          className="prose prose-sm max-w-none rounded-2xl border border-gray-200 bg-white p-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
        />
      )}
    </section>
  );
}
