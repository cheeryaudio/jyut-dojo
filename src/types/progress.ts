export interface ScenarioProgress {
  scenarioId: string;
  bestStars: number;
  attempts: number;
  lastScore: number;
  completedAt: string;
}

export type ScenarioProgressMap = Record<string, ScenarioProgress>;
