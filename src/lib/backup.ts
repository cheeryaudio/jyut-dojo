import { useActivityStore } from "../stores/activityStore";
import { useCourseStore, type CourseProgress, type PhraseReviewRecord } from "../stores/courseStore";
import { readProgress, useReaderStore, type ReaderProgress } from "../stores/readerStore";

export interface StudyBackupPayload {
  app: "jyut-dojo";
  version: 1;
  exportedAt: string;
  courses: {
    progress: Record<string, CourseProgress>;
    bookmarks: string[];
    lastCourseId: string | null;
    phraseReviews: Record<string, PhraseReviewRecord>;
  };
  readers: {
    progress: Record<string, ReaderProgress>;
  };
  activityDates: string[];
}

export async function exportStudyBackup(now = new Date()): Promise<StudyBackupPayload> {
  await Promise.all([
    useCourseStore.getState().hydrate(),
    useReaderStore.getState().hydrate(),
    useActivityStore.getState().hydrate(),
  ]);
  const courseState = useCourseStore.getState();
  const readerState = useReaderStore.getState();
  const activityState = useActivityStore.getState();

  return {
    app: "jyut-dojo",
    version: 1,
    exportedAt: now.toISOString(),
    courses: {
      progress: courseState.progress,
      bookmarks: courseState.bookmarks,
      lastCourseId: courseState.lastCourseId,
      phraseReviews: courseState.phraseReviews,
    },
    readers: {
      progress: readerState.progress,
    },
    activityDates: activityState.dates,
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

function sanitizePhraseReviews(raw: unknown): Record<string, PhraseReviewRecord> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, PhraseReviewRecord> = {};
  for (const [phraseId, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    if (typeof item.reviewedAt !== "string" || typeof item.remembered !== "boolean") continue;
    result[phraseId] = {
      reviewedAt: item.reviewedAt,
      remembered: item.remembered,
      ...(typeof item.due === "string" ? { due: item.due } : {}),
      ...(typeof item.stability === "number" ? { stability: item.stability } : {}),
      ...(typeof item.difficulty === "number" ? { difficulty: item.difficulty } : {}),
      ...(typeof item.reps === "number" ? { reps: item.reps } : {}),
      ...(typeof item.lapses === "number" ? { lapses: item.lapses } : {}),
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
  }, mode);
  await useReaderStore.getState().importReaderData(readerProgress, mode);
  await useActivityStore.getState().importDates(activityDates, mode);

  const finalCourses = useCourseStore.getState();
  const finalReaders = useReaderStore.getState();
  return {
    coursesCount: Object.keys(finalCourses.progress).length,
    bookmarksCount: finalCourses.bookmarks.length,
    readersCount: Object.keys(finalReaders.progress).length,
  };
}
