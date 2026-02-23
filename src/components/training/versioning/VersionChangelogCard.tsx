import { Sparkles } from "lucide-react";
import { Card, Badge } from "@/components/shared";

interface Props {
  summary?: string | null;
  details?: string | null;
}

export default function VersionChangelogCard({ summary, details }: Props) {
  if (!summary && !details) return null;

  return (
    <Card className="border-purple-200 bg-purple-50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <span className="font-medium text-purple-700">Analyse IA des modifications</span>
        <Badge color="purple" size="sm">Gemini</Badge>
      </div>

      {summary && (
        <p className="text-sm font-medium text-purple-800 mb-2">
          {summary}
        </p>
      )}

      {details && (
        <div className="text-sm text-purple-700 space-y-1">
          {details.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </Card>
  );
}
