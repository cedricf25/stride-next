"use client";

import { useState, useCallback } from "react";

interface UseAiAnalysisOptions {
  initialAnalysis?: string;
}

interface UseAiAnalysisReturn {
  analysis: string;
  loading: boolean;
  error: string;
  handleAnalyze: () => Promise<void>;
}

export function useAiAnalysis(
  action: () => Promise<{ analysis: string; error?: string }>,
  { initialAnalysis }: UseAiAnalysisOptions = {},
): UseAiAnalysisReturn {
  const [analysis, setAnalysis] = useState(initialAnalysis ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!initialAnalysis) setAnalysis("");

    const result = await action();
    if (result.error) {
      setError(result.error);
    } else {
      setAnalysis(result.analysis);
    }
    setLoading(false);
  }, [action, initialAnalysis]);

  return { analysis, loading, error, handleAnalyze };
}
