"use client";

import { useCallback, useState } from "react";
import { Sparkles, RefreshCw, Calendar } from "lucide-react";
import { fetchSleepAnalysis, generateSleepAnalysis, type HealthAnalysisResult } from "@/actions/gemini";
import MarkdownContent from "@/components/MarkdownContent";
import { SectionHeader, Button, AlertBanner, Card } from "@/components/shared";

interface Props {
  initialAnalysis: HealthAnalysisResult;
}

export default function SleepAiAnalysis({ initialAnalysis }: Props) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    const result = await generateSleepAnalysis();
    setAnalysis(result);
    setLoading(false);
  }, []);

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatAnalysisDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="mt-8">
      <SectionHeader
        icon={<Sparkles className="h-5 w-5 text-indigo-500" />}
        title="Analyse IA"
        className="mb-4"
      >
        {!analysis.analysis && (
          <Button variant="ai" onClick={handleGenerate} loading={loading}>
            {loading ? "Analyse en cours..." : "Générer l'analyse"}
          </Button>
        )}
        {analysis.analysis && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {loading ? "Actualisation..." : "Mettre à jour"}
          </Button>
        )}
      </SectionHeader>

      {loading && (
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

      {analysis.error && (
        <AlertBanner variant="error">{analysis.error}</AlertBanner>
      )}

      {analysis.analysis && !loading && (
        <>
          <Card padding="sm" className="mb-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Période : {formatDate(analysis.periodStart)} — {formatDate(analysis.periodEnd)}
              </span>
            </div>
            <span className="text-gray-400">•</span>
            <span>{analysis.dataPointsCount} nuits</span>
            {analysis.createdAt && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">
                  Analyse du {formatAnalysisDate(analysis.createdAt)}
                </span>
              </>
            )}
          </Card>
          <MarkdownContent content={analysis.analysis} />
        </>
      )}

      {!analysis.analysis && !loading && !analysis.error && (
        <Card padding="md" className="text-center text-gray-500">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-indigo-300" />
          <p>Cliquez sur "Générer l'analyse" pour obtenir une analyse IA de votre sommeil.</p>
          <p className="text-sm mt-1">L'analyse sera sauvegardée et pourra être mise à jour ultérieurement.</p>
        </Card>
      )}
    </section>
  );
}
