import localforage from "localforage";
import { create } from "zustand";
import { createReviewCard, scheduleReview } from "../lib/srs/fsrs";
import type { ReviewCard, ReviewRating } from "../types/domain";
import { useActivityStore } from "./activityStore";

export interface CourseProgress { openedAt: string; section?: string; completedAt?: string; answers: Record<string, string> }
export interface PhraseReviewRecord {
  reviewedAt: string;
  remembered: boolean;
  rating?: ReviewRating;
  due?: string;
  stability?: number;
  difficulty?: number;
  reps?: number;
  lapses?: number;
}
interface CourseState {
  progress: Record<string, CourseProgress>;
  bookmarks: string[];
  lastCourseId: string | null;
  phraseReviews: Record<string, PhraseReviewRecord>;
  hydrated: boolean;
  storageError: string;
  hydrate: () => Promise<void>;
  openCourse: (id: string) => Promise<void>;
  setSection: (id: string, section: string) => Promise<void>;
  answerExercise: (id: string, questionId: string, answer: string) => Promise<void>;
  completeCourse: (id: string) => Promise<void>;
  toggleBookmark: (phraseId: string) => Promise<void>;
  recordPhraseReview: (phraseId: string, rememberedOrRating: boolean | ReviewRating, now?: Date) => Promise<void>;
  importCourseData: (data: Partial<SavedState>, mode?: "merge" | "replace") => Promise<void>;
}
const storage = localforage.createInstance({ name: "jyut-dojo", storeName: "courses", description: "Scene courses and saved expressions" });
export type SavedState = Pick<CourseState, "progress" | "bookmarks" | "lastCourseId" | "phraseReviews">;
let saving = Promise.resolve();
let hydrating: Promise<void> | null = null;
let canPersist = true;

function toReviewCard(phraseId: string, previous: PhraseReviewRecord | undefined, now: Date): ReviewCard {
  if (!previous) return createReviewCard(phraseId, now);
  if (typeof previous.stability === "number" && typeof previous.difficulty === "number" && typeof previous.reps === "number") {
    return {
      wordId: phraseId,
      due: previous.due ?? previous.reviewedAt,
      stability: previous.stability,
      difficulty: previous.difficulty,
      reps: previous.reps,
      lapses: previous.lapses ?? (previous.remembered ? 0 : 1),
      lastReview: previous.reviewedAt,
    };
  }
  return {
    wordId: phraseId,
    due: previous.due ?? previous.reviewedAt,
    stability: previous.remembered ? 2.4 : 0.4,
    difficulty: 5,
    reps: 1,
    lapses: previous.remembered ? 0 : 1,
    lastReview: previous.reviewedAt,
  };
}

export const useCourseStore = create<CourseState>((set, get) => {
  const persist = () => {
    if (!canPersist) return Promise.resolve();
    const { progress, bookmarks, lastCourseId, phraseReviews } = get();
    const snapshot: SavedState = { progress, bookmarks, lastCourseId, phraseReviews };
    saving = saving.then(async () => { await storage.setItem("scene-courses:v1", snapshot); }).catch(() => { set({ storageError: "本机储存暂时不可用，离开页面前请留意学习记录。" }); });
    return saving;
  };
  const update = (id: string, change: Partial<CourseProgress>) => {
    const previous = get().progress[id] ?? { openedAt: new Date().toISOString(), answers: {} };
    set({ progress: { ...get().progress, [id]: { ...previous, ...change } } });
    return persist();
  };
  return {
    progress: {}, bookmarks: [], lastCourseId: null, phraseReviews: {}, hydrated: false, storageError: "",
    hydrate: async () => {
      if (get().hydrated) return;
      if (!hydrating) hydrating = (async () => {
        try {
          const saved = await storage.getItem<SavedState>("scene-courses:v1");
          if (saved && saved.progress && typeof saved.progress === "object" && Array.isArray(saved.bookmarks)) set({ progress: saved.progress, bookmarks: saved.bookmarks, lastCourseId: saved.lastCourseId ?? null, phraseReviews: saved.phraseReviews ?? {} });
        } catch { canPersist = false; set({ storageError: "未能读取本机记录，本次操作暂时只保留在当前页面。请稍后重新打开。" }); }
        set({ hydrated: true });
      })().finally(() => { hydrating = null; });
      await hydrating;
    },
    openCourse: async (id) => { await get().hydrate(); set({ lastCourseId: id }); await update(id, { openedAt: new Date().toISOString() }); },
    setSection: async (id, section) => { await get().hydrate(); await update(id, { section }); },
    answerExercise: async (id, questionId, answer) => { await get().hydrate(); await update(id, { answers: { ...get().progress[id]?.answers, [questionId]: answer } }); },
    completeCourse: async (id) => {
      await get().hydrate();
      await update(id, { completedAt: get().progress[id]?.completedAt ?? new Date().toISOString() });
      await useActivityStore.getState().recordActivity().catch(() => undefined);
    },
    toggleBookmark: async (phraseId) => {
      await get().hydrate();
      set({ bookmarks: get().bookmarks.includes(phraseId) ? get().bookmarks.filter(id => id !== phraseId) : [...get().bookmarks, phraseId] });
      await persist();
    },
    recordPhraseReview: async (phraseId, rememberedOrRating, now = new Date()) => {
      await get().hydrate();
      const rating: ReviewRating = typeof rememberedOrRating === "boolean"
        ? (rememberedOrRating ? "good" : "again")
        : rememberedOrRating;
      const remembered = rating !== "again";
      const previous = get().phraseReviews[phraseId];
      const scheduled = scheduleReview(toReviewCard(phraseId, previous, now), rating, now);
      set({
        phraseReviews: {
          ...get().phraseReviews,
          [phraseId]: {
            reviewedAt: now.toISOString(),
            remembered,
            rating,
            due: scheduled.due,
            stability: scheduled.stability,
            difficulty: scheduled.difficulty,
            reps: scheduled.reps,
            lapses: scheduled.lapses,
          },
        },
      });
      await persist();
      await useActivityStore.getState().recordActivity().catch(() => undefined);
    },
    importCourseData: async (data, mode = "merge") => {
      await get().hydrate();
      const current = get();
      const nextProgress = mode === "replace" ? (data.progress ?? {}) : { ...current.progress, ...(data.progress ?? {}) };
      const nextBookmarks = mode === "replace"
        ? [...new Set(data.bookmarks ?? [])]
        : [...new Set([...current.bookmarks, ...(data.bookmarks ?? [])])];
      const nextReviews = mode === "replace"
        ? (data.phraseReviews ?? {})
        : { ...current.phraseReviews, ...(data.phraseReviews ?? {}) };
      const nextLastCourseId = data.lastCourseId ?? (mode === "replace" ? null : current.lastCourseId);
      set({
        progress: nextProgress,
        bookmarks: nextBookmarks,
        phraseReviews: nextReviews,
        lastCourseId: nextLastCourseId,
      });
      await persist();
    },
  };
});
