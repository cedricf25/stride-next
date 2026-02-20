"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeActivity } from "@/actions/gemini";

interface Props {
  activityId: number;
  existingAnalysis: string | null;
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
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div
          className="prose prose-sm max-w-none rounded-xl border border-gray-200 bg-white p-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
        />
      )}
    </section>
  );
}
