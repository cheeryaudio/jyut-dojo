export type LearningGoal = "daily" | "work" | "integration";

export interface LearnerProfile {
  goal: LearningGoal;
  dailyMinutes: 10 | 20 | 30;
  createdAt: string;
}

export type CurriculumUnitStatus = "ready" | "planned";

export interface CurriculumUnit {
  id: string;
  title: string;
  mandarin: string;
  description: string;
  route?: string;
  status: CurriculumUnitStatus;
  minutes: number;
}

export interface CurriculumStage {
  id: string;
  level: number;
  title: string;
  mandarin: string;
  outcome: string;
  units: CurriculumUnit[];
}

export type DailyTaskKind = "diagnostic" | "review" | "tone" | "lesson" | "speaking";

export interface DailyTask {
  id: string;
  kind: DailyTaskKind;
  title: string;
  mandarin: string;
  reason: string;
  route: string;
  minutes: number;
}
