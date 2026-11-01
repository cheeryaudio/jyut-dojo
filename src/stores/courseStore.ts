import localforage from "localforage";
import { create } from "zustand";
import { courseById } from "../data/courses";
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
export interface DrillAttemptRecord {
  drillId: string;
  courseId: string;
  phraseId: string;
  kind: "listening" | "puzzle";
  correct: boolean;
  answer: string;
  attemptedAt: string;
}

interface CourseState {
  progress: Record<string, CourseProgress>;
  bookmarks: string[];
  lastCourseId: string | null;
  phraseReviews: Record<string, PhraseReviewRecord>;
  drillResults: Record<string, DrillAttemptRecord>;
  hydrated: boolean;
  storageError: string;
  hydrate: () => Promise<void>;
  openCourse: (id: string) => Promise<void>;
  setSection: (id: string, section: string) => Promise<void>;
  answerExercise: (id: string, questionId: string, answer: string) => Promise<void>;
  completeCourse: (id: string) => Promise<void>;
  toggleBookmark: (phraseId: string) => Promise<void>;
  recordPhraseReview: (phraseId: string, rememberedOrRating: boolean | ReviewRating, now?: Date) => Promise<void>;
  recordDrillResult: (input: Omit<DrillAttemptRecord, "attemptedAt">, now?: Date) => Promise<void>;
  clearDrillResult: (drillId: string) => Promise<void>;
  importCourseData: (data: Partial<SavedState>, mode?: "merge" | "replace") => Promise<void>;
}
const storage = localforage.createInstance({ name: "jyut-dojo", storeName: "courses", description: "Scene courses and saved expressions" });
export type SavedState = Pick<CourseState, "progress" | "bookmarks" | "lastCourseId" | "phraseReviews"> & {
  drillResults?: Record<string, DrillAttemptRecord>;
};
let saving = Promise.resolve();
let hydrating: Promise<void> | null = null;
let canPersist = true;

export function toPhraseReviewCard(phraseId: string, previous: PhraseReviewRecord | undefined, now: Date): ReviewCard {
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

function safeTime(iso: string | undefined): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeCourseEntry(courseId: string, cur: CourseProgress, inc: CourseProgress): CourseProgress {
  const incNewer = safeTime(inc.openedAt) >= safeTime(cur.openedAt);
  const openedAt = incNewer ? inc.openedAt : cur.openedAt;
  const section = (incNewer ? inc.section ?? cur.section : cur.section ?? inc.section);
  let completedAt: string | undefined;
  if (cur.completedAt && inc.completedAt) {
    completedAt = safeTime(inc.completedAt) < safeTime(cur.completedAt) ? inc.completedAt : cur.completedAt;
  } else {
    completedAt = cur.completedAt ?? inc.completedAt;
  }

  const course = courseById.get(courseId);
  const correctByQId = new Map(course?.exercises.map(ex => [ex.id, ex.answer]) ?? []);
  const answers: Record<string, string> = { ...cur.answers };
  for (const [qId, incAns] of Object.entries(inc.answers ?? {})) {
    if (!incAns) continue;
    const curAns = answers[qId];
    if (!curAns) {
      answers[qId] = incAns;
      continue;
    }
    const targetCorrect = correctByQId.get(qId);
    if (targetCorrect) {
      if (curAns === targetCorrect) continue;
      if (incAns === targetCorrect) {
        answers[qId] = incAns;
        continue;
      }
    }
    if (incNewer) answers[qId] = incAns;
  }

  return {
    openedAt,
    answers,
    ...(section ? { section } : {}),
    ...(completedAt ? { completedAt } : {}),
  };
}

export const useCourseStore = create<CourseState>((set, get) => {
  const persist = () => {
    if (!canPersist) return Promise.resolve();
    const { progress, bookmarks, lastCourseId, phraseReviews, drillResults } = get();
    const snapshot: SavedState = {
      progress,
      bookmarks,
      lastCourseId,
      phraseReviews,
      ...(Object.keys(drillResults).length > 0 ? { drillResults } : {}),
    };
    saving = saving.then(async () => { await storage.setItem("scene-courses:v1", snapshot); }).catch(() => { set({ storageError: "本机储存暂时不可用，离开页面前请留意学习记录。" }); });
    return saving;
  };
  const update = (id: string, change: Partial<CourseProgress>) => {
    const previous = get().progress[id] ?? { openedAt: new Date().toISOString(), answers: {} };
    set({ progress: { ...get().progress, [id]: { ...previous, ...change } } });
    return persist();
  };
  return {
    progress: {}, bookmarks: [], lastCourseId: null, phraseReviews: {}, drillResults: {}, hydrated: false, storageError: "",
    hydrate: async () => {
      if (get().hydrated) return;
      if (!hydrating) hydrating = (async () => {
        try {
          const saved = await storage.getItem<SavedState>("scene-courses:v1");
          if (saved && saved.progress && typeof saved.progress === "object" && Array.isArray(saved.bookmarks)) {
            set({
              progress: saved.progress,
              bookmarks: saved.bookmarks,
              lastCourseId: saved.lastCourseId ?? null,
              phraseReviews: saved.phraseReviews ?? {},
              drillResults: saved.drillResults ?? {},
            });
          }
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
      const scheduled = scheduleReview(toPhraseReviewCard(phraseId, previous, now), rating, now);
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
    recordDrillResult: async (input, now = new Date()) => {
      await get().hydrate();
      const record: DrillAttemptRecord = {
        ...input,
        attemptedAt: now.toISOString(),
      };
      set({
        drillResults: {
          ...get().drillResults,
          [input.drillId]: record,
        },
      });
      await persist();
      await useActivityStore.getState().recordActivity().catch(() => undefined);
    },
    clearDrillResult: async (drillId) => {
      await get().hydrate();
      const next = { ...get().drillResults };
      delete next[drillId];
      set({ drillResults: next });
      await persist();
    },
    importCourseData: async (data, mode = "merge") => {
      await get().hydrate();
      const current = get();
      if (mode === "replace") {
        set({
          progress: data.progress ?? {},
          bookmarks: [...new Set(data.bookmarks ?? [])],
          phraseReviews: data.phraseReviews ?? {},
          drillResults: data.drillResults ?? {},
          lastCourseId: data.lastCourseId ?? null,
        });
        await persist();
        return;
      }

      const nextProgress: Record<string, CourseProgress> = { ...current.progress };
      for (const [courseId, inc] of Object.entries(data.progress ?? {})) {
        const cur = nextProgress[courseId];
        nextProgress[courseId] = cur ? mergeCourseEntry(courseId, cur, inc) : inc;
      }

      const nextBookmarks = [...new Set([...current.bookmarks, ...(data.bookmarks ?? [])])];

      const nextReviews: Record<string, PhraseReviewRecord> = { ...current.phraseReviews };
      for (const [phraseId, inc] of Object.entries(data.phraseReviews ?? {})) {
        const cur = nextReviews[phraseId];
        if (!cur) {
          nextReviews[phraseId] = inc;
        } else {
          const curTime = safeTime(cur.reviewedAt);
          const incTime = safeTime(inc.reviewedAt);
          if (incTime > curTime || (incTime === curTime && (inc.reps ?? 0) > (cur.reps ?? 0))) {
            nextReviews[phraseId] = inc;
          }
        }
      }

      const nextDrills: Record<string, DrillAttemptRecord> = { ...current.drillResults };
      for (const [drillId, inc] of Object.entries(data.drillResults ?? {})) {
        const cur = nextDrills[drillId];
        if (!cur || safeTime(inc.attemptedAt) >= safeTime(cur.attemptedAt)) {
          nextDrills[drillId] = inc;
        }
      }

      const nextLastCourseId = current.lastCourseId ?? data.lastCourseId ?? null;
      set({
        progress: nextProgress,
        bookmarks: nextBookmarks,
        phraseReviews: nextReviews,
        drillResults: nextDrills,
        lastCourseId: nextLastCourseId,
      });
      await persist();
    },
  };
});
