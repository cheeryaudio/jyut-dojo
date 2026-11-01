import { describe, expect, it } from "vitest";
import { courses } from "../data/courses";
import {
  getCourseMistakes,
  getDuePracticePhrases,
  getPracticePhrases,
  isPhraseDue,
  previewPhraseIntervalLabel,
  sortPracticePhrasesByFSRS,
} from "./coursePractice";
import { scheduleReview } from "./srs/fsrs";
import { toPhraseReviewCard, type CourseProgress, type PhraseReviewRecord } from "../stores/courseStore";

const course = courses[0]!;
const question = course.exercises[0]!;

describe("life course practice scope and FSRS expression scheduling", () => {
  it("shows wrong attempts and removes a question after correction without counting unanswered items", () => {
    const saved: Record<string, CourseProgress> = { [course.id]: { openedAt: "2026-10-18", answers: { [question.id]: question.options.find(option => option !== question.answer)! } } };
    expect(getCourseMistakes(saved)).toHaveLength(1);
    saved[course.id]!.answers[question.id] = question.answer;
    expect(getCourseMistakes(saved)).toEqual([]);
    saved[course.id]!.answers[question.id] = "";
    expect(getCourseMistakes(saved)).toEqual([]);
  });

  it("limits learned recall to completed lessons, while bookmarks can come from any lesson", () => {
    const saved = { [course.id]: { openedAt: "2026-10-18", answers: {} } };
    expect(getPracticePhrases(saved, [course.phrases[1]!.id], "learned")).toEqual([]);
    expect(getPracticePhrases(saved, [course.phrases[1]!.id], "saved")).toHaveLength(1);
    expect(getPracticePhrases({ [course.id]: { ...saved[course.id]!, completedAt: "2026-10-18" } }, [], "learned")).toHaveLength(course.phrases.length);
  });

  it("identifies due expressions, prioritizes overdue reviews before new items, and respects daily new-card caps", () => {
    const now = new Date("2026-11-02T12:00:00.000Z");
    const p1 = course.phrases[0]!.id;
    const p2 = course.phrases[1]!.id;
    const p3 = course.phrases[2]!.id;

    const reviews: Record<string, PhraseReviewRecord> = {
      [p1]: {
        reviewedAt: "2026-11-01T12:00:00.000Z",
        remembered: true,
        due: "2026-11-05T12:00:00.000Z",
        stability: 3,
        difficulty: 5,
        reps: 1,
      },
      [p2]: {
        reviewedAt: "2026-10-25T12:00:00.000Z",
        remembered: true,
        due: "2026-11-01T12:00:00.000Z",
        stability: 2,
        difficulty: 5,
        reps: 2,
      },
    };

    expect(isPhraseDue(reviews[p1], now)).toBe(false);
    expect(isPhraseDue(reviews[p2], now)).toBe(true);
    expect(isPhraseDue(reviews[p3], now)).toBe(true);

    // Overdue review (p2) comes before brand-new unreviewed item (p3)
    const dueList = getDuePracticePhrases({}, [p1, p2, p3], reviews, "saved", now);
    expect(dueList.map(item => item.phrase.id)).toEqual([p2, p3]);

    const sortedAll = sortPracticePhrasesByFSRS(
      getPracticePhrases({}, [p1, p2, p3], "saved"),
      reviews,
      now,
    );
    expect(sortedAll.map(item => item.phrase.id)).toEqual([p2, p3, p1]);

    // When 3 courses (36 phrases) are completed at 10 min/day (limit 12 new/day), only 12 new cards are surfaced
    const threeCompleted: Record<string, CourseProgress> = {
      [courses[0]!.id]: { openedAt: "2026-11-01", completedAt: "2026-11-01", answers: {} },
      [courses[1]!.id]: { openedAt: "2026-11-01", completedAt: "2026-11-01", answers: {} },
      [courses[2]!.id]: { openedAt: "2026-11-01", completedAt: "2026-11-01", answers: {} },
    };
    const capped = getDuePracticePhrases(threeCompleted, [], {}, "learned", now, { dailyMinutes: 10 });
    expect(capped).toHaveLength(12);
  });

  it("uses identical card conversion for previewPhraseIntervalLabel and actual scheduleReview on legacy records", () => {
    const now = new Date("2026-11-02T00:00:00.000Z");
    const legacyRemembered: PhraseReviewRecord = {
      reviewedAt: "2026-10-30T00:00:00.000Z",
      remembered: true,
    };
    const scheduled = scheduleReview(toPhraseReviewCard("p1", legacyRemembered, now), "good", now);
    const expectedDays = Math.max(1, Math.round((Date.parse(scheduled.due) - now.getTime()) / 86_400_000));
    expect(previewPhraseIntervalLabel("p1", legacyRemembered, "good", now)).toBe(`${expectedDays} 天后`);
  });
});
