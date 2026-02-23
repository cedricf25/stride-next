import { Sparkles } from "lucide-react";
import type { SessionSnapshot } from "@/types/training-version";

interface Props {
  weekNumber: number;
  dayOfWeek: string;
  changeType: "added" | "removed" | "modified";
  before?: SessionSnapshot;
  after?: SessionSnapshot;
  changes?: { field: string; before: unknown; after: unknown }[];
  changeReason?: string;
}

const dayLabels: Record<string, string> = {
  lundi: "Lun",
  mardi: "Mar",
  mercredi: "Mer",
  jeudi: "Jeu",
  vendredi: "Ven",
  samedi: "Sam",
  dimanche: "Dim",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (field === "distance") return `${value} km`;
  if (field === "duration") return `${value} min`;
  return String(value);
}

export default function SessionDiffCard({
  weekNumber,
  dayOfWeek,
  changeType,
  before,
  after,
  changes,
  changeReason,
}: Props) {
  const session = after ?? before;
  if (!session) return null;

  // Pour les modifications, vérifier qu'il y a des changements significatifs à afficher
  // Sinon, ne pas afficher cette carte (évite "Modifiée" sans détails)
  if (changeType === "modified") {
    const significantChanges = (changes ?? []).filter(
      (c) => c.before != null && c.after != null
    );
    if (significantChanges.length === 0) return null;
  }

  const changeLabel =
    changeType === "added"
      ? "Ajoutée"
      : changeType === "removed"
        ? "Supprimée"
        : "Modifiée";

  const changeColor =
    changeType === "added"
      ? "text-green-600"
      : changeType === "removed"
        ? "text-red-600"
        : "text-orange-600";

  return (
    <div className="py-2 border-b border-[var(--border-default)] last:border-b-0">
      {/* Header: S1 - Lun | Titre | Badge changement */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)] min-w-[60px]">
            S{weekNumber} - {dayLabels[dayOfWeek.toLowerCase()] ?? dayOfWeek}
          </span>
          <span className="text-sm text-[var(--text-primary)]">
            {session.title}
          </span>
        </div>
        <span className={`text-xs font-medium ${changeColor}`}>
          {changeLabel}
        </span>
      </div>

      {/* Modifications détaillées */}
      {changeType === "modified" && changes && changes.length > 0 && (() => {
        // Filtrer les changements peu significatifs (null → valeur ou valeur → null)
        const significantChanges = changes
          .filter((c) => c.before != null && c.after != null);

        if (significantChanges.length === 0) return null;

        return (
          <div className="mt-1 ml-[68px] text-sm text-[var(--text-secondary)]">
            {significantChanges.map((c, i, arr) => (
              <span key={i}>
                {formatValue(c.field, c.before)}
                <span className="mx-1">→</span>
                <span className="text-green-600 font-medium">
                  {formatValue(c.field, c.after)}
                </span>
                {i < arr.length - 1 && <span className="mx-2">•</span>}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Info pour ajout/suppression */}
      {(changeType === "added" || changeType === "removed") && (
        <div className="mt-1 ml-[68px] text-xs text-[var(--text-tertiary)]">
          {session.distance && `${session.distance} km`}
          {session.distance && session.duration && " • "}
          {session.duration && `${session.duration} min`}
          {session.targetPace && ` • ${session.targetPace}`}
        </div>
      )}

      {/* Justification IA */}
      {changeReason && (
        <div className="mt-1.5 ml-[68px] flex items-start gap-1.5 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
          <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{changeReason}</span>
        </div>
      )}
    </div>
  );
}
