import localforage from "localforage";
import { create } from "zustand";
import { pairKey, type TonePair } from "../lib/tones";
import type { AccuracyStat, ToneNumber, ToneProgress } from "../types/tone";
import { useActivityStore } from "./activityStore";

const STORAGE_KEY = "jyut-dojo:tone-progress:v1";

const emptyProgress: ToneProgress = {
  bestLevel: 1,
  totalAnswers: 0,
  byTone: {},
  byPair: {},
};

interface ToneState {
  progress: ToneProgress;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  recordAnswer: (tone: ToneNumber, pair: TonePair, correct: boolean, level: number) => Promise<void>;
  importToneProgress: (incoming: ToneProgress, mode?: "merge" | "replace") => Promise<void>;
}

const toneStorage = localforage.createInstance({
  name: "jyut-dojo",
  storeName: "progress",
  description: "Local Jyut Dojo tone training progress",
});

const increment = (previous: AccuracyStat | undefined, correct: boolean): AccuracyStat => ({
  correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
  total: (previous?.total ?? 0) + 1,
});

export const useToneStore = create<ToneState>((set, get) => ({
  progress: emptyProgress,
  hydrated: false,
  hydrate: async () => {
    const saved = await toneStorage.getItem<ToneProgress>(STORAGE_KEY);
    set({ progress: saved ?? emptyProgress, hydrated: true });
  },
  recordAnswer: async (tone, pair, correct, level) => {
    const current = get().progress;
    const key = pairKey(pair);
    const updated: ToneProgress = {
      bestLevel: Math.max(current.bestLevel, level),
      totalAnswers: current.totalAnswers + 1,
      byTone: { ...current.byTone, [tone]: increment(current.byTone[tone], correct) },
      byPair: { ...current.byPair, [key]: increment(current.byPair[key], correct) },
    };
    set({ progress: updated });
    await Promise.all([
      toneStorage.setItem(STORAGE_KEY, updated),
      useActivityStore.getState().recordActivity(),
    ]);
  },
  importToneProgress: async (incoming, mode = "merge") => {
    if (!get().hydrated) await get().hydrate();
    if (mode === "replace" || incoming.totalAnswers > get().progress.totalAnswers) {
      const next: ToneProgress = {
        bestLevel: Math.max(mode === "replace" ? 1 : get().progress.bestLevel, incoming.bestLevel ?? 1),
        totalAnswers: incoming.totalAnswers ?? 0,
        byTone: incoming.byTone ?? {},
        byPair: incoming.byPair ?? {},
      };
      set({ progress: next });
      await toneStorage.setItem(STORAGE_KEY, next);
    }
  },
}));
