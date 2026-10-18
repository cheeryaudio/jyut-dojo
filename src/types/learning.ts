export type CapabilityDomain = "tone" | "pronunciation" | "vocabulary" | "pattern" | "listening" | "speaking";

export type LessonStepId = "diagnose" | "input" | "breakdown" | "practice" | "output" | "transfer" | "delayed";

export type EvidenceKind = "diagnostic" | "comprehension" | "controlled" | "spoken" | "transfer" | "review";

export type LearningErrorType = "tone" | "sound" | "word" | "pattern" | "meaning" | "fluency" | "pragmatics";

export interface LessonPhrase {
  id: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  note: string;
  audio?: string;
}

export interface DeepLessonUnit {
  id: string;
  level: number;
  title: string;
  mandarin: string;
  context: string;
  goal: string;
  capabilityIds: string[];
  phrases: LessonPhrase[];
  pattern: string;
  patternNote: string;
  substitutions: string[];
  rolePrompt: string;
  transferPrompt: string;
  repairTip: string;
}

export interface LearningEvent {
  id: string;
  unitId: string;
  capabilityIds: string[];
  stepId: LessonStepId;
  kind: EvidenceKind;
  score: number;
  errorType?: LearningErrorType;
  createdAt: string;
}

export interface DelayedCheck {
  unitId: string;
  due: string;
  completedAt?: string;
}

export interface UnitMastery {
  unitId: string;
  score: number;
  completedSteps: LessonStepId[];
  completedAt?: string;
}

export interface CapabilitySummary {
  capabilityId: string;
  score: number;
  evidenceCount: number;
  lastEvidenceAt?: string;
}
