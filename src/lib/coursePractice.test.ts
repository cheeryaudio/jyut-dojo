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
import type { CourseProgress, PhraseReviewRecord } from "../stores/courseStore";

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

  it("identifies due expressions and sorts due items before future-scheduled FSRS items", () => {
    const now = new Date("2026-11-02T00:00:00.000Z");
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
        reps: 1,
      },
    };

    expect(isPhraseDue(reviews[p1], now)).toBe(false);
    expect(isPhraseDue(reviews[p2], now)).toBe(true);
    expect(isPhraseDue(reviews[p3], now)).toBe(true);

    const dueList = getDuePracticePhrases({}, [p1, p2, p3], reviews, "saved", now);
    expect(dueList.map(item => item.phrase.id)).toEqual([p3, p2]);

    const sortedAll = sortPracticePhrasesByFSRS(
      getPracticePhrases({}, [p1, p2, p3], "saved"),
      reviews,
      now,
    );
    expect(sortedAll.map(item => item.phrase.id)).toEqual([p3, p2, p1]);
  });

  it("previews human-readable FSRS intervals for all four ratings", () => {
    const now = new Date("2026-11-02T00:00:00.000Z");
    expect(previewPhraseIntervalLabel("p1", undefined, "again", now)).toBe("10 分钟后");
    expect(previewPhraseIntervalLabel("p1", undefined, "good", now)).toMatch(/^\d+ 天后$/);
    expect(previewPhraseIntervalLabel("p1", undefined, "easy", now)).toMatch(/^\d+ 天后$/);
  });
});
