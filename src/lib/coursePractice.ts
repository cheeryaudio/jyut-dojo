import { courses } from "../data/courses";
import { scheduleReview } from "./srs/fsrs";
import { toPhraseReviewCard, type CourseProgress, type PhraseReviewRecord } from "../stores/courseStore";
import type { ReviewRating } from "../types/domain";

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
    // Among due items, scheduled reviews that are overdue come before brand-new unreviewed items
    if (dueA && Boolean(recA) !== Boolean(recB)) return recA ? -1 : 1;
    const targetA = recA?.due ?? recA?.reviewedAt ?? "";
    const targetB = recB?.due ?? recB?.reviewedAt ?? "";
    return targetA.localeCompare(targetB);
  });
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function getDailyNewPhraseLimit(dailyMinutes: 10 | 20 | 30 = 20): number {
  return dailyMinutes === 10 ? 12 : dailyMinutes === 30 ? 30 : 20;
}

export interface DuePracticeOptions {
  dailyMinutes?: 10 | 20 | 30;
  capNewCards?: boolean;
}

export function getDuePracticePhrases(
  progress: Record<string, CourseProgress>,
  bookmarks: string[],
  phraseReviews: Record<string, PhraseReviewRecord>,
  source: "saved" | "learned",
  now = new Date(),
  options: DuePracticeOptions = {},
) {
  const all = getPracticePhrases(progress, bookmarks, source);
  const reviewDue: typeof all = [];
  const newCards: typeof all = [];

  for (const item of all) {
    const rec = phraseReviews[item.phrase.id];
    if (!rec) {
      newCards.push(item);
    } else if (isPhraseDue(rec, now)) {
      reviewDue.push(item);
    }
  }

  const sortedReviewDue = sortPracticePhrasesByFSRS(reviewDue, phraseReviews, now);

  if (options.capNewCards === false) {
    return [...sortedReviewDue, ...newCards];
  }

  const dailyLimit = getDailyNewPhraseLimit(options.dailyMinutes ?? 20);
  const newIntroducedToday = Object.values(phraseReviews).filter(
    rec => (rec.reps ?? 1) === 1 && isSameLocalDay(rec.reviewedAt, now),
  ).length;
  const remainingQuota = Math.max(0, dailyLimit - newIntroducedToday);
  return [...sortedReviewDue, ...newCards.slice(0, remainingQuota)];
}

export function previewPhraseIntervalLabel(
  phraseId: string,
  previous: PhraseReviewRecord | undefined,
  rating: ReviewRating,
  now = new Date(),
): string {
  if (rating === "again") return "10 分钟后";
  const baseCard = toPhraseReviewCard(phraseId, previous, now);
  const next = scheduleReview(baseCard, rating, now);
  const days = Math.max(1, Math.round((Date.parse(next.due) - now.getTime()) / DAY_MS));
  return `${days} 天后`;
}
