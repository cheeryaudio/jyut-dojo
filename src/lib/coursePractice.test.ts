import { describe, expect, it } from "vitest";
import { courses } from "../data/courses";
import { getCourseMistakes, getPracticePhrases } from "./coursePractice";
import type { CourseProgress } from "../stores/courseStore";

const course = courses[0]!;
const question = course.exercises[0]!;
describe("life course practice scope", () => {
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
});
