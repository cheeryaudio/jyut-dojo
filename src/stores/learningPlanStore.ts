import localforage from "localforage";
import { create } from "zustand";
import type { LearnerProfile } from "../types/curriculum";

const STORAGE_KEY = "jyut-dojo:learner-profile:v1";

const planStorage = localforage.createInstance({
  name: "jyut-dojo",
  storeName: "profile",
  description: "Local Jyut Dojo learner goal and study plan",
});

interface LearningPlanState {
  profile: LearnerProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  saveProfile: (profile: Omit<LearnerProfile, "createdAt">) => Promise<void>;
}

export const useLearningPlanStore = create<LearningPlanState>((set) => ({
  profile: null,
  hydrated: false,
  hydrate: async () => {
    const profile = await planStorage.getItem<LearnerProfile>(STORAGE_KEY);
    set({ profile, hydrated: true });
  },
  saveProfile: async (input) => {
    const profile: LearnerProfile = { ...input, createdAt: new Date().toISOString() };
    set({ profile });
    await planStorage.setItem(STORAGE_KEY, profile);
  },
}));
