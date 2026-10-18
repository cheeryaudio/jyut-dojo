export interface Word {
  id: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  tones: number[];
}

export interface Sentence {
  id: string;
  words: string[];
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  scenarioId: string;
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  intro: string;
  sentences: string[];
}

export interface ToneItem {
  id: string;
  setId: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  tone: number;
}

export interface ReviewCard {
  wordId: string;
  due: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview?: string;
}

export type ReviewMode = "audio" | "hanzi" | "jyutping";
export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ModuleStatus = "ready" | "coming-soon";
