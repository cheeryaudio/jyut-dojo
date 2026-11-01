import { beforeEach, describe, expect, it, vi } from "vitest";
import { courses } from "../data/courses";

const { getItem, setItem } = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("localforage", () => ({
  default: {
    createInstance: () => ({ getItem, setItem }),
  },
}));

beforeEach(() => {
  vi.resetModules();
  getItem.mockReset().mockResolvedValue(null);
  setItem.mockReset().mockResolvedValue(undefined);
});

describe("study backup export and smart non-regressing import", () => {
  it("exports all stores and never regresses newer progress or corrected answers when merging an older backup", async () => {
    const { useCourseStore } = await import("../stores/courseStore");
    const { exportStudyBackup, importStudyBackupJson } = await import("./backup");

    const course = courses[0]!;
    const q1 = course.exercises[0]!;
    const wrongOption = q1.options.find(o => o !== q1.answer)!;

    // Current state has a corrected answer, completed course, and a newer FSRS review
    await useCourseStore.getState().openCourse(course.id);
    await useCourseStore.getState().answerExercise(course.id, q1.id, q1.answer);
    await useCourseStore.getState().completeCourse(course.id);
    await useCourseStore.getState().toggleBookmark("hello-1");
    await useCourseStore.getState().recordPhraseReview("hello-1", "easy", new Date("2026-11-02T10:00:00.000Z"));
    await useCourseStore.getState().recordDrillResult({
      drillId: "listen:hello-1",
      courseId: course.id,
      phraseId: "hello-1",
      kind: "listening",
      correct: true,
      answer: "你好",
    }, new Date("2026-11-02T10:05:00.000Z"));

    const exported = await exportStudyBackup(new Date("2026-11-02T12:00:00.000Z"));
    expect(exported.app).toBe("jyut-dojo");
    expect(exported.version).toBe(2);
    expect(exported.courses.phraseReviews["hello-1"]?.rating).toBe("easy");
    expect(exported.courses.drillResults?.["listen:hello-1"]?.correct).toBe(true);

    // Now import an OLDER backup where q1 was wrong, course was not completed, and hello-1 was rated "again" earlier
    const olderBackupJson = JSON.stringify({
      app: "jyut-dojo",
      version: 2,
      exportedAt: "2026-10-20T00:00:00.000Z",
      courses: {
        progress: {
          [course.id]: {
            openedAt: "2026-10-20T00:00:00.000Z",
            answers: { [q1.id]: wrongOption },
          },
        },
        bookmarks: ["hello-2"],
        lastCourseId: course.id,
        phraseReviews: {
          "hello-1": {
            reviewedAt: "2026-10-20T00:00:00.000Z",
            remembered: false,
            rating: "again",
            due: "2026-10-20T00:10:00.000Z",
            stability: 0.4,
            difficulty: 7,
            reps: 1,
            lapses: 1,
          },
          "hello-2": {
            reviewedAt: "2026-10-20T00:00:00.000Z",
            remembered: true,
            rating: "good",
            due: "2026-10-23T00:00:00.000Z",
          },
        },
      },
      readers: { progress: {} },
      activityDates: ["2026-10-20"],
    });

    await importStudyBackupJson(olderBackupJson, "merge");
    const after = useCourseStore.getState();

    // Newer state preserved!
    expect(after.progress[course.id]?.completedAt).toBeDefined();
    expect(after.progress[course.id]?.answers[q1.id]).toBe(q1.answer);
    expect(after.phraseReviews["hello-1"]?.rating).toBe("easy");
    expect(after.phraseReviews["hello-1"]?.remembered).toBe(true);
    // And new items from backup were merged in
    expect(after.phraseReviews["hello-2"]?.rating).toBe("good");
    expect(after.bookmarks).toEqual(["hello-1", "hello-2"]);
  });

  it("rejects malformed or non-JyutDojo JSON payloads", async () => {
    const { importStudyBackupJson } = await import("./backup");
    await expect(importStudyBackupJson("not-json")).rejects.toThrow("JSON");
    await expect(importStudyBackupJson(JSON.stringify({ app: "other" }))).rejects.toThrow("备份文件");
  });
});
