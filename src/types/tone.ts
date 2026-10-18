export type ToneNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface AccuracyStat {
  correct: number;
  total: number;
}

export interface ToneProgress {
  bestLevel: number;
  totalAnswers: number;
  byTone: Partial<Record<ToneNumber, AccuracyStat>>;
  byPair: Record<string, AccuracyStat>;
}
