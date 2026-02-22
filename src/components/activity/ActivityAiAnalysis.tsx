"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeActivity } from "@/actions/gemini";
import MarkdownContent from "@/components/MarkdownContent";

interface Props {
  activityId: number;
  existingAnalysis: string | null;
}

export default function ActivityAiAnalysis({ activityId, existingAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<string>(existingAnalysis ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");

    const result = await analyzeActivity(activityId);

    if (result.error) {
      setError(result.error);
    } else {
      setAnalysis(result.analysis);
    }

    setLoading(false);
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Analyse IA
        </h3>
        {!analysis && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Analyse en cours..." : "Analyser cette course"}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border-l-4 border-l-gray-200 bg-white shadow-sm p-5 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-gray-200" />
              <div className="h-3 w-full animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      )}

      {analysis && <MarkdownContent content={analysis} />}
    </section>
  );
}
