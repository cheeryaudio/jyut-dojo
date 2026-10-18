import localforage from "localforage";
import { create } from "zustand";

const STORAGE_KEY = "jyut-dojo:activity-days:v1";
let hydrating: Promise<void> | null = null;

const activityStorage = localforage.createInstance({
  name: "jyut-dojo",
  storeName: "progress",
  description: "Local Jyut Dojo learning activity dates",
});

const localDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface ActivityState {
  dates: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  recordActivity: (date?: Date) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  dates: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    if (!hydrating) hydrating = (async () => {
      const saved = await activityStorage.getItem<string[]>(STORAGE_KEY);
      set({ dates: [...new Set([...(saved ?? []), ...get().dates])].sort(), hydrated: true });
    })().finally(() => { hydrating = null; });
    await hydrating;
  },
  recordActivity: async (date = new Date()) => {
    if (!get().hydrated) await get().hydrate();
    const next = [...new Set([...get().dates, localDateKey(date)])].sort();
    set({ dates: next });
    await activityStorage.setItem(STORAGE_KEY, next);
  },
}));

export const calculateStreak = (dates: string[], today = new Date()): number => {
  const days = new Set(dates);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
