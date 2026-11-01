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
  importScenarioProgress: (incoming: ScenarioProgressMap, mode?: "merge" | "replace") => Promise<void>;
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
  importScenarioProgress: async (incoming, mode = "merge") => {
    if (!get().hydrated) await get().hydrate();
    if (mode === "replace") {
      set({ scenarioProgress: incoming });
      await progressStore.setItem(STORAGE_KEY, incoming);
      return;
    }
    const merged: ScenarioProgressMap = { ...get().scenarioProgress };
    for (const [id, inc] of Object.entries(incoming)) {
      const cur = merged[id];
      if (!cur) {
        merged[id] = inc;
      } else {
        const curNewer = Date.parse(cur.completedAt) >= Date.parse(inc.completedAt);
        merged[id] = {
          scenarioId: id,
          bestStars: Math.max(cur.bestStars, inc.bestStars),
          attempts: Math.max(cur.attempts, inc.attempts),
          lastScore: curNewer ? cur.lastScore : inc.lastScore,
          completedAt: curNewer ? cur.completedAt : inc.completedAt,
        };
      }
    }
    set({ scenarioProgress: merged });
    await progressStore.setItem(STORAGE_KEY, merged);
  },
}));
