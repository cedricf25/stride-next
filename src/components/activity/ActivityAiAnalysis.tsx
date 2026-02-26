"use client";

import { useCallback, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { analyzeActivity, reanalyzeActivity } from "@/actions/gemini";
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

  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalysisResult, setReanalysisResult] = useState<string | null>(null);

  const handleReanalyze = useCallback(async () => {
    setReanalyzing(true);
    const result = await reanalyzeActivity(activityId);
    if (!result.error) {
      setReanalysisResult(result.analysis);
    }
    setReanalyzing(false);
  }, [activityId]);

  const displayedAnalysis = reanalysisResult ?? analysis;

  return (
    <section>
      <SectionHeader
        icon={<Sparkles className="h-5 w-5 text-purple-500" />}
        title="Analyse IA"
        className="mb-4"
      >
        {!displayedAnalysis && (
          <Button variant="ai" onClick={handleAnalyze} loading={loading}>
            {loading ? "Analyse en cours..." : "Analyser cette course"}
          </Button>
        )}
        {displayedAnalysis && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReanalyze}
            loading={reanalyzing}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {reanalyzing ? "Réanalyse..." : "Refaire l'analyse"}
          </Button>
        )}
      </SectionHeader>

      {(loading || reanalyzing) && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border-l-4 border-l-[var(--bg-subtle)] bg-[var(--bg-surface)] shadow-sm p-5 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-3 w-full animate-pulse rounded-full bg-[var(--bg-muted)]" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--bg-muted)]" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <AlertBanner variant="error">{error}</AlertBanner>
      )}

      {displayedAnalysis && !reanalyzing && <MarkdownContent content={displayedAnalysis} />}
    </section>
  );
}
