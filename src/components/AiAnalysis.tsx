"use client";

import { useCallback } from "react";
import { Sparkles } from "lucide-react";
import { analyzeGlobalCoaching } from "@/actions/gemini";
import MarkdownContent from "@/components/MarkdownContent";
import SectionHeader from "@/components/shared/SectionHeader";
import { useAiAnalysis } from "@/hooks/useAiAnalysis";

export default function AiAnalysis() {
  const action = useCallback(() => analyzeGlobalCoaching(), []);
  const { analysis, loading, error, handleAnalyze } = useAiAnalysis(action);

  return (
    <section className="mt-8">
      <SectionHeader
        icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        title="Coaching IA"
        as="h2"
        size="lg"
        className="mb-4"
      >
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyse en cours..." : "Analyser mon entraînement"}
        </button>
      </SectionHeader>

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
