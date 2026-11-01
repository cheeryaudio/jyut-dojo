import { useActivityStore } from "../stores/activityStore";
import { useCourseStore, type CourseProgress, type DrillAttemptRecord, type PhraseReviewRecord } from "../stores/courseStore";
import { useLearningPlanStore } from "../stores/learningPlanStore";
import { useLearningStore } from "../stores/learningStore";
import { useMasteryStore } from "../stores/masteryStore";
import { readProgress, useReaderStore, type ReaderProgress } from "../stores/readerStore";
import { useReviewStore } from "../stores/reviewStore";
import { useToneStore } from "../stores/toneStore";
import type { LearnerProfile } from "../types/curriculum";
import type { ReviewCard, ReviewRating } from "../types/domain";
import type { DelayedCheck, LearningEvent } from "../types/learning";
import type { ScenarioProgressMap } from "../types/progress";
import type { ToneProgress } from "../types/tone";

export interface StudyBackupPayload {
  app: "jyut-dojo";
  version: 2;
  exportedAt: string;
  courses: {
    progress: Record<string, CourseProgress>;
    bookmarks: string[];
    lastCourseId: string | null;
    phraseReviews: Record<string, PhraseReviewRecord>;
    drillResults?: Record<string, DrillAttemptRecord>;
  };
  readers: {
    progress: Record<string, ReaderProgress>;
  };
  activityDates: string[];
  legacy?: {
    reviewCards?: ReviewCard[];
    scenarioProgress?: ScenarioProgressMap;
    toneProgress?: ToneProgress;
    masteryEvents?: LearningEvent[];
    delayedChecks?: DelayedCheck[];
    learnerProfile?: LearnerProfile | null;
  };
}

export async function exportStudyBackup(now = new Date()): Promise<StudyBackupPayload> {
  await Promise.all([
    useCourseStore.getState().hydrate(),
    useReaderStore.getState().hydrate(),
    useActivityStore.getState().hydrate(),
    useReviewStore.getState().hydrate().catch(() => undefined),
    useLearningStore.getState().hydrate().catch(() => undefined),
    useToneStore.getState().hydrate().catch(() => undefined),
    useMasteryStore.getState().hydrate().catch(() => undefined),
    useLearningPlanStore.getState().hydrate().catch(() => undefined),
  ]);
  const courseState = useCourseStore.getState();
  const readerState = useReaderStore.getState();
  const activityState = useActivityStore.getState();
  const reviewState = useReviewStore.getState();
  const learningState = useLearningStore.getState();
  const toneState = useToneStore.getState();
  const masteryState = useMasteryStore.getState();
  const planState = useLearningPlanStore.getState();

  return {
    app: "jyut-dojo",
    version: 2,
    exportedAt: now.toISOString(),
    courses: {
      progress: courseState.progress,
      bookmarks: courseState.bookmarks,
      lastCourseId: courseState.lastCourseId,
      phraseReviews: courseState.phraseReviews,
      drillResults: courseState.drillResults,
    },
    readers: {
      progress: readerState.progress,
    },
    activityDates: activityState.dates,
    legacy: {
      reviewCards: reviewState.cards,
      scenarioProgress: learningState.scenarioProgress,
      toneProgress: toneState.progress,
      masteryEvents: masteryState.events,
      delayedChecks: masteryState.delayedChecks,
      learnerProfile: planState.profile,
    },
  };
}

function sanitizeCourseProgress(raw: unknown): Record<string, CourseProgress> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, CourseProgress> = {};
  for (const [courseId, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    const openedAt = typeof item.openedAt === "string" ? item.openedAt : new Date().toISOString();
    const completedAt = typeof item.completedAt === "string" ? item.completedAt : undefined;
    const section = typeof item.section === "string" ? item.section : undefined;
    const answers: Record<string, string> = {};
    if (item.answers && typeof item.answers === "object" && !Array.isArray(item.answers)) {
      for (const [qId, ans] of Object.entries(item.answers as Record<string, unknown>)) {
        if (typeof ans === "string") answers[qId] = ans;
      }
    }
    result[courseId] = {
      openedAt,
      answers,
      ...(section ? { section } : {}),
      ...(completedAt ? { completedAt } : {}),
    };
  }
  return result;
}

const VALID_RATINGS = new Set<ReviewRating>(["again", "hard", "good", "easy"]);

function sanitizePhraseReviews(raw: unknown): Record<string, PhraseReviewRecord> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, PhraseReviewRecord> = {};
  for (const [phraseId, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    if (typeof item.reviewedAt !== "string" || typeof item.remembered !== "boolean") continue;
    const rating = typeof item.rating === "string" && VALID_RATINGS.has(item.rating as ReviewRating)
      ? (item.rating as ReviewRating)
      : undefined;
    result[phraseId] = {
      reviewedAt: item.reviewedAt,
      remembered: item.remembered,
      ...(rating ? { rating } : {}),
      ...(typeof item.due === "string" ? { due: item.due } : {}),
      ...(typeof item.stability === "number" ? { stability: item.stability } : {}),
      ...(typeof item.difficulty === "number" ? { difficulty: item.difficulty } : {}),
      ...(typeof item.reps === "number" ? { reps: item.reps } : {}),
      ...(typeof item.lapses === "number" ? { lapses: item.lapses } : {}),
    };
  }
  return result;
}

function sanitizeDrillResults(raw: unknown): Record<string, DrillAttemptRecord> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, DrillAttemptRecord> = {};
  for (const [drillId, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    if (
      typeof item.courseId !== "string" ||
      typeof item.phraseId !== "string" ||
      (item.kind !== "listening" && item.kind !== "puzzle") ||
      typeof item.correct !== "boolean" ||
      typeof item.attemptedAt !== "string"
    ) {
      continue;
    }
    result[drillId] = {
      drillId,
      courseId: item.courseId,
      phraseId: item.phraseId,
      kind: item.kind,
      correct: item.correct,
      answer: typeof item.answer === "string" ? item.answer : "",
      attemptedAt: item.attemptedAt,
    };
  }
  return result;
}

export async function importStudyBackupJson(
  rawJson: string,
  mode: "merge" | "replace" = "merge",
): Promise<{ coursesCount: number; bookmarksCount: number; readersCount: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("备份文件不是有效的 JSON 格式。");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("备份文件内容格式不正确。");
  }
  const payload = parsed as Record<string, unknown>;
  if (payload.app !== "jyut-dojo" || !payload.courses || typeof payload.courses !== "object") {
    throw new Error("这不是有效的粤语道场学习备份文件。");
  }

  const coursesRaw = payload.courses as Record<string, unknown>;
  const progress = sanitizeCourseProgress(coursesRaw.progress);
  const bookmarks = Array.isArray(coursesRaw.bookmarks)
    ? coursesRaw.bookmarks.filter((item): item is string => typeof item === "string")
    : [];
  const lastCourseId = typeof coursesRaw.lastCourseId === "string" ? coursesRaw.lastCourseId : null;
  const phraseReviews = sanitizePhraseReviews(coursesRaw.phraseReviews);
  const drillResults = sanitizeDrillResults(coursesRaw.drillResults);

  const readersRaw = (payload.readers && typeof payload.readers === "object"
    ? (payload.readers as Record<string, unknown>).progress
    : undefined);
  const readerProgress = readProgress(readersRaw);

  const activityDates = Array.isArray(payload.activityDates)
    ? payload.activityDates.filter((item): item is string => typeof item === "string")
    : [];

  await useCourseStore.getState().importCourseData({
    progress,
    bookmarks,
    lastCourseId,
    phraseReviews,
    drillResults,
  }, mode);
  await useReaderStore.getState().importReaderData(readerProgress, mode);
  await useActivityStore.getState().importDates(activityDates, mode);

  if (payload.legacy && typeof payload.legacy === "object" && !Array.isArray(payload.legacy)) {
    const leg = payload.legacy as Record<string, unknown>;
    if (Array.isArray(leg.reviewCards)) {
      await useReviewStore.getState().importCards(leg.reviewCards as ReviewCard[], mode).catch(() => undefined);
    }
    if (leg.scenarioProgress && typeof leg.scenarioProgress === "object" && !Array.isArray(leg.scenarioProgress)) {
      await useLearningStore.getState().importScenarioProgress(leg.scenarioProgress as ScenarioProgressMap, mode).catch(() => undefined);
    }
    if (leg.toneProgress && typeof leg.toneProgress === "object" && !Array.isArray(leg.toneProgress)) {
      await useToneStore.getState().importToneProgress(leg.toneProgress as ToneProgress, mode).catch(() => undefined);
    }
    if (Array.isArray(leg.masteryEvents) || Array.isArray(leg.delayedChecks)) {
      await useMasteryStore.getState().importMasteryData(
        Array.isArray(leg.masteryEvents) ? (leg.masteryEvents as LearningEvent[]) : [],
        Array.isArray(leg.delayedChecks) ? (leg.delayedChecks as DelayedCheck[]) : [],
        mode,
      ).catch(() => undefined);
    }
    if (leg.learnerProfile && typeof leg.learnerProfile === "object") {
      const prof = leg.learnerProfile as LearnerProfile;
      if ((prof.goal === "daily" || prof.goal === "work" || prof.goal === "integration") && (prof.dailyMinutes === 10 || prof.dailyMinutes === 20 || prof.dailyMinutes === 30)) {
        const curProfile = useLearningPlanStore.getState().profile;
        if (!curProfile || mode === "replace") {
          await useLearningPlanStore.getState().saveProfile({ goal: prof.goal, dailyMinutes: prof.dailyMinutes }).catch(() => undefined);
        }
      }
    }
  }

  const finalCourses = useCourseStore.getState();
  const finalReaders = useReaderStore.getState();
  return {
    coursesCount: Object.keys(finalCourses.progress).length,
    bookmarksCount: finalCourses.bookmarks.length,
    readersCount: Object.keys(finalReaders.progress).length,
  };
}
