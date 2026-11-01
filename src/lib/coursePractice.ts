import { courses } from "../data/courses";
import { createReviewCard, scheduleReview } from "./srs/fsrs";
import type { CourseProgress, PhraseReviewRecord } from "../stores/courseStore";
import type { ReviewCard, ReviewRating } from "../types/domain";

const DAY_MS = 86_400_000;

export function getCourseMistakes(progress: Record<string, CourseProgress>) {
  return courses.flatMap(course => course.exercises.flatMap(exercise => {
    const answer = progress[course.id]?.answers[exercise.id];
    return answer && answer !== exercise.answer ? [{ course, exercise, answer }] : [];
  }));
}

export function getPracticePhrases(progress: Record<string, CourseProgress>, bookmarks: string[], source: "saved" | "learned") {
  return courses.flatMap(course => course.phrases.flatMap(phrase => {
    const include = source === "saved" ? bookmarks.includes(phrase.id) : Boolean(progress[course.id]?.completedAt);
    return include ? [{ course, phrase }] : [];
  }));
}

export function isPhraseDue(record: PhraseReviewRecord | undefined, now = new Date()): boolean {
  if (!record) return true;
  if (record.due) {
    const dueMs = Date.parse(record.due);
    if (Number.isFinite(dueMs)) return dueMs <= now.getTime();
  }
  if (!record.remembered) return true;
  const reviewedMs = Date.parse(record.reviewedAt);
  if (!Number.isFinite(reviewedMs)) return true;
  return reviewedMs + DAY_MS <= now.getTime();
}

export function sortPracticePhrasesByFSRS<T extends { phrase: { id: string } }>(
  items: T[],
  phraseReviews: Record<string, PhraseReviewRecord>,
  now = new Date(),
): T[] {
  return [...items].sort((a, b) => {
    const recA = phraseReviews[a.phrase.id];
    const recB = phraseReviews[b.phrase.id];
    const dueA = isPhraseDue(recA, now);
    const dueB = isPhraseDue(recB, now);
    if (dueA !== dueB) return dueA ? -1 : 1;
    const targetA = recA?.due ?? recA?.reviewedAt ?? "";
    const targetB = recB?.due ?? recB?.reviewedAt ?? "";
    return targetA.localeCompare(targetB);
  });
}

export function getDuePracticePhrases(
  progress: Record<string, CourseProgress>,
  bookmarks: string[],
  phraseReviews: Record<string, PhraseReviewRecord>,
  source: "saved" | "learned",
  now = new Date(),
) {
  const all = getPracticePhrases(progress, bookmarks, source);
  return sortPracticePhrasesByFSRS(
    all.filter(item => isPhraseDue(phraseReviews[item.phrase.id], now)),
    phraseReviews,
    now,
  );
}

export function previewPhraseIntervalLabel(
  phraseId: string,
  previous: PhraseReviewRecord | undefined,
  rating: ReviewRating,
  now = new Date(),
): string {
  if (rating === "again") return "10 分钟后";
  const baseCard: ReviewCard = previous && typeof previous.stability === "number" && typeof previous.difficulty === "number" && typeof previous.reps === "number"
    ? {
        wordId: phraseId,
        due: previous.due ?? previous.reviewedAt,
        stability: previous.stability,
        difficulty: previous.difficulty,
        reps: previous.reps,
        lapses: previous.lapses ?? (previous.remembered ? 0 : 1),
        lastReview: previous.reviewedAt,
      }
    : createReviewCard(phraseId, now);
  const next = scheduleReview(baseCard, rating, now);
  const days = Math.max(1, Math.round((Date.parse(next.due) - now.getTime()) / DAY_MS));
  return `${days} 天后`;
}
