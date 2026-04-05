export interface SessionSnapshot {
  sortOrder?: number;
  dayOfWeek: string;
  sessionType: string;
  title: string;
  description: string;
  distance: number | null;
  duration: number | null;
  targetPace: string | null;
  targetHRZone: string | null;
  intensity: string;
  workoutSummary?: string | null; // Résumé court pour intervalles: "3×10' Z4", "8×400m"
  elevationGain?: number | null;
  terrainType?: string | null;
  exercises?: string | null; // JSON array d'exercices pour séances strength
  changeReason?: string; // Justification IA pour les modifications
}

export interface WeekSnapshot {
  weekNumber: number;
  theme: string;
  totalVolume: number | null;
  sessions: SessionSnapshot[];
}

export interface DeletionRecord {
  weekNumber: number;
  dayOfWeek: string;
  reason: string;
}

export interface PlanSnapshot {
  versionNumber: number;
  createdAt: string;
  goalProbability: number | null;
  goalAssessment: string | null;
  weeks: WeekSnapshot[];
  deletedSessions?: DeletionRecord[];
}

export interface SessionDiff {
  weekNumber: number;
  dayOfWeek: string;
  changeType: "added" | "removed" | "modified";
  before?: SessionSnapshot;
  after?: SessionSnapshot;
  changes?: { field: string; before: unknown; after: unknown }[];
  changeReason?: string; // Justification IA pour cette modification
}

export interface VersionDiff {
  sessionsAdded: number;
  sessionsRemoved: number;
  sessionsModified: number;
  volumeChange: number;
  details: SessionDiff[];
}

export interface VersionSummary {
  id: string;
  versionNumber: number;
  createdAt: Date;
  triggerReason: string | null;
  changelogSummary: string | null;
  sessionsAdded: number;
  sessionsRemoved: number;
  sessionsModified: number;
  volumeChange: number | null;
}
