import localforage from "localforage";
import { create } from "zustand";
import type { ScenarioProgressMap } from "../types/progress";
import { useActivityStore } from "./activityStore";

const STORAGE_KEY = "jyut-dojo:scenario-progress:v1";

interface LearningState {
  scenarioProgress: ScenarioProgressMap;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  recordQuizResult: (scenarioId: string, score: number) => Promise<void>;
}

const progressStore = localforage.createInstance({
  name: "jyut-dojo",
  storeName: "progress",
  description: "Local Jyut Dojo lesson and quiz progress",
});

export const useLearningStore = create<LearningState>((set, get) => ({
  scenarioProgress: {},
  hydrated: false,
  hydrate: async () => {
    const saved = await progressStore.getItem<ScenarioProgressMap>(STORAGE_KEY);
    set({ scenarioProgress: saved ?? {}, hydrated: true });
  },
  recordQuizResult: async (scenarioId, score) => {
    const previous = get().scenarioProgress[scenarioId];
    const updated: ScenarioProgressMap = {
      ...get().scenarioProgress,
      [scenarioId]: {
        scenarioId,
        bestStars: Math.max(previous?.bestStars ?? 0, score),
        attempts: (previous?.attempts ?? 0) + 1,
        lastScore: score,
        completedAt: new Date().toISOString(),
      },
    };
    set({ scenarioProgress: updated });
    await Promise.all([
      progressStore.setItem(STORAGE_KEY, updated),
      useActivityStore.getState().recordActivity(),
    ]);
  },
}));
