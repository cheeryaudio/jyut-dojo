import { beforeEach, describe, expect, it, vi } from "vitest";

const { getItem, setItem, recordActivity } = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(), recordActivity: vi.fn() }));
vi.mock("localforage", () => ({ default: { createInstance: () => ({ getItem, setItem }) } }));
vi.mock("./activityStore", () => ({ useActivityStore: { getState: () => ({ recordActivity }) } }));
beforeEach(() => { vi.resetModules(); getItem.mockReset(); setItem.mockReset().mockResolvedValue(undefined); recordActivity.mockReset().mockResolvedValue(undefined); });

describe("life course storage upgrades", () => {
  it("waits for old records before an early bookmark and shares concurrent hydration", async () => {
    let finish!: (value: unknown) => void;
    getItem.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { useCourseStore } = await import("./courseStore");
    const first = useCourseStore.getState().hydrate();
    const second = useCourseStore.getState().hydrate();
    const click = useCourseStore.getState().toggleBookmark("new-phrase");
    expect(setItem).not.toHaveBeenCalled();
    finish({ progress: { existing: { openedAt: "2026-10-17", answers: { q1: "answer" } } }, bookmarks: ["old-phrase"], lastCourseId: "existing" });
    await Promise.all([first, second, click]);
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(useCourseStore.getState().bookmarks).toEqual(["old-phrase", "new-phrase"]);
    expect(setItem.mock.calls.at(-1)?.[1].progress.existing.answers.q1).toBe("answer");
    expect(useCourseStore.getState().phraseReviews).toEqual({});
  });
  it("retains old saves when loading fails", async () => {
    getItem.mockRejectedValue(new Error("database unavailable"));
    const { useCourseStore } = await import("./courseStore");
    await useCourseStore.getState().toggleBookmark("new-phrase");
    expect(useCourseStore.getState().storageError).not.toBe("");
    expect(setItem).not.toHaveBeenCalled();
  });
  it("serializes quick answers and saves FSRS-scheduled recall without changing course completion", async () => {
    getItem.mockResolvedValue(null);
    const { useCourseStore } = await import("./courseStore");
    await Promise.all([
      useCourseStore.getState().answerExercise("course", "q1", "first"),
      useCourseStore.getState().answerExercise("course", "q2", "second"),
    ]);
    const now = new Date("2026-11-02T00:00:00.000Z");
    await useCourseStore.getState().recordPhraseReview("phrase", false, now);
    await useCourseStore.getState().recordPhraseReview("phrase-easy", "easy", now);
    const saved = setItem.mock.calls.at(-1)?.[1];
    expect(saved.progress.course.answers).toEqual({ q1: "first", q2: "second" });
    expect(saved.progress.course.completedAt).toBeUndefined();
    expect(saved.phraseReviews.phrase.remembered).toBe(false);
    expect(saved.phraseReviews.phrase.rating).toBe("again");
    expect(saved.phraseReviews.phrase.due).toBe("2026-11-02T00:10:00.000Z");
    expect(saved.phraseReviews["phrase-easy"].remembered).toBe(true);
    expect(saved.phraseReviews["phrase-easy"].rating).toBe("easy");
    expect(saved.phraseReviews["phrase-easy"].stability).toBeGreaterThan(2);
    expect(recordActivity).toHaveBeenCalledTimes(2);
  });
  it("keeps the original completion date when a completed lesson is reread", async () => {
    getItem.mockResolvedValue({ progress: { course: { openedAt: "2026-10-17", completedAt: "2026-10-17T10:00:00.000Z", answers: {} } }, bookmarks: [], lastCourseId: "course" });
    const { useCourseStore } = await import("./courseStore");
    await useCourseStore.getState().completeCourse("course");
    expect(useCourseStore.getState().progress.course?.completedAt).toBe("2026-10-17T10:00:00.000Z");
  });
});
