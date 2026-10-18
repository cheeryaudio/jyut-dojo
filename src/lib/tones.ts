import type { ToneItem } from "../types/domain";
import type { ToneNumber } from "../types/tone";

export interface ToneDefinition {
  tone: ToneNumber;
  name: string;
  contour: string;
  levels: readonly [number, number];
  color: string;
}

export type TonePair = readonly [ToneNumber, ToneNumber];

export interface DrillQuestion {
  item: ToneItem;
  pair: TonePair;
  choices: ToneNumber[];
}

export interface DrillProgressState {
  level: number;
  streak: number;
  reinforcement: TonePair[];
}

export const TONE_DEFINITIONS: ToneDefinition[] = [
  { tone: 1, name: "高平", contour: "55", levels: [5, 5], color: "#d94a2c" },
  { tone: 2, name: "高升", contour: "25", levels: [2, 5], color: "#d97706" },
  { tone: 3, name: "中平", contour: "33", levels: [3, 3], color: "#2f855a" },
  { tone: 4, name: "低降", contour: "21", levels: [2, 1], color: "#2878a5" },
  { tone: 5, name: "低升", contour: "23", levels: [2, 3], color: "#7c5cc4" },
  { tone: 6, name: "低平", contour: "22", levels: [2, 2], color: "#a13f6f" },
];

const PAIRS_BY_LEVEL: Record<number, TonePair[]> = {
  1: [[1, 4]],
  2: [[1, 4], [1, 6], [2, 4]],
  3: [[2, 5], [3, 6], [4, 6]],
};

export const pairKey = (pair: TonePair): string => [...pair].sort().join("v");

export const advanceDrillProgress = (
  state: DrillProgressState,
  pair: TonePair,
  correct: boolean,
): DrillProgressState => {
  if (!correct) {
    return { ...state, streak: 0, reinforcement: [...state.reinforcement, pair] };
  }
  const streak = state.streak + 1;
  if (streak >= 5 && state.level < 3) {
    return { ...state, level: state.level + 1, streak: 0 };
  }
  return { ...state, streak: Math.min(5, streak) };
};

const randomItem = <T,>(items: readonly T[], random: () => number): T => {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("Cannot choose from an empty item list");
  return item;
};

export const createDrillQuestion = (
  level: number,
  reinforcement: TonePair[],
  toneItems: ToneItem[],
  random: () => number = Math.random,
): { question: DrillQuestion; remainingReinforcement: TonePair[] } => {
  const reinforcedPair = reinforcement[0];
  const pair = reinforcedPair ?? randomItem(PAIRS_BY_LEVEL[level] ?? PAIRS_BY_LEVEL[3] ?? [], random);
  const sets = [...new Set(toneItems.map((item) => item.setId))];
  const setId = randomItem(sets, random);
  const correctTone = randomItem(pair, random);
  const item = toneItems.find((candidate) => candidate.setId === setId && candidate.tone === correctTone);
  if (item === undefined) throw new Error(`Missing tone ${correctTone} item in set ${setId}`);

  return {
    question: { item, pair, choices: [...pair].sort(() => random() - 0.5) },
    remainingReinforcement: reinforcedPair === undefined ? reinforcement : reinforcement.slice(1),
  };
};
