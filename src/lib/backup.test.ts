import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("study backup export and import", () => {
  it("exports current state and merges imported backup records safely", async () => {
    const { useCourseStore } = await import("../stores/courseStore");
    const { exportStudyBackup, importStudyBackupJson } = await import("./backup");

    await useCourseStore.getState().toggleBookmark("hello-1");
    const exported = await exportStudyBackup(new Date("2026-11-02T00:00:00.000Z"));
    expect(exported.app).toBe("jyut-dojo");
    expect(exported.courses.bookmarks).toEqual(["hello-1"]);

    const incomingJson = JSON.stringify({
      app: "jyut-dojo",
      version: 1,
      exportedAt: "2026-11-02T01:00:00.000Z",
      courses: {
        progress: {
          "first-words-hello": {
            openedAt: "2026-11-01T10:00:00.000Z",
            completedAt: "2026-11-01T10:15:00.000Z",
            answers: { q1: "A" },
          },
        },
        bookmarks: ["hello-2"],
        lastCourseId: "first-words-hello",
        phraseReviews: {
          "hello-2": {
            reviewedAt: "2026-11-01T10:20:00.000Z",
            remembered: true,
            due: "2026-11-04T10:20:00.000Z",
          },
        },
      },
      readers: {
        progress: {},
      },
      activityDates: ["2026-11-01"],
    });

    const summary = await importStudyBackupJson(incomingJson, "merge");
    expect(summary.coursesCount).toBe(1);
    expect(summary.bookmarksCount).toBe(2);
    expect(useCourseStore.getState().bookmarks).toEqual(["hello-1", "hello-2"]);
  });

  it("rejects malformed or non-JyutDojo JSON payloads", async () => {
    const { importStudyBackupJson } = await import("./backup");
    await expect(importStudyBackupJson("not-json")).rejects.toThrow("JSON");
    await expect(importStudyBackupJson(JSON.stringify({ app: "other" }))).rejects.toThrow("备份文件");
  });
});
