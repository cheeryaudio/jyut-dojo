import { courses } from "../data/courses";
import type { CourseProgress } from "../stores/courseStore";

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
