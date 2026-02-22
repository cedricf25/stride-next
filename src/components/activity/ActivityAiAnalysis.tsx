"use client";

import { useCallback } from "react";
import { Sparkles } from "lucide-react";
import { analyzeActivity } from "@/actions/gemini";
import MarkdownContent from "@/components/MarkdownContent";
import { SectionHeader, Button, AlertBanner } from "@/components/shared";
import { useAiAnalysis } from "@/hooks/useAiAnalysis";

interface Props {
  activityId: number;
  existingAnalysis: string | null;
}

export default function ActivityAiAnalysis({ activityId, existingAnalysis }: Props) {
  const action = useCallback(() => analyzeActivity(activityId), [activityId]);
  const { analysis, loading, error, handleAnalyze } = useAiAnalysis(action, {
    initialAnalysis: existingAnalysis ?? "",
  });

  return (
    <section>
      <SectionHeader
        icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        title="Analyse IA"
        className="mb-4"
      >
        {!analysis && (
          <Button variant="ai" onClick={handleAnalyze} loading={loading}>
            {loading ? "Analyse en cours..." : "Analyser cette course"}
          </Button>
        )}
      </SectionHeader>

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
        <AlertBanner variant="error">{error}</AlertBanner>
      )}

      {analysis && <MarkdownContent content={analysis} />}
    </section>
  );
}
