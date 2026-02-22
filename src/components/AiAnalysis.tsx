"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeGlobalCoaching } from "@/actions/gemini";
import MarkdownContent from "@/components/MarkdownContent";

export default function AiAnalysis() {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setAnalysis("");

    const result = await analyzeGlobalCoaching();

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
          Coaching IA
        </h2>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyse en cours..." : "Analyser mon entraînement"}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-purple-200/60" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border-l-4 border-l-gray-200 bg-white shadow-sm p-5 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-gray-200" />
              <div className="h-3 w-full animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      )}

      {analysis && <MarkdownContent content={analysis} />}
    </section>
  );
}
