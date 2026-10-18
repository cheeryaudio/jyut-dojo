import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setItem: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  hydrateActivity: vi.fn<() => Promise<void>>(),
  recordActivity: vi.fn<() => Promise<void>>(),
}));

vi.mock("localforage", () => ({
  default: {
    createInstance: () => ({ getItem: mocks.getItem, setItem: mocks.setItem }),
  },
}));

vi.mock("../data/readers", () => ({
  readerById: new Map([
    ["reader-a", { id: "reader-a", questions: [
      { id: "a-1", options: ["一", "二"], answer: "一" },
      { id: "a-2", options: ["三", "四"], answer: "四" },
      { id: "a-3", options: ["五", "六"], answer: "五" },
    ] }],
    ["reader-b", { id: "reader-b", questions: [
      { id: "b-1", options: ["七", "八"], answer: "七" },
    ] }],
  ]),
}));

vi.mock("./activityStore", () => ({
  useActivityStore: { getState: () => ({
    hydrate: mocks.hydrateActivity,
    recordActivity: mocks.recordActivity,
  }) },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

const loadStore = async () => (await import("./readerStore")).useReaderStore;

describe("reader progress persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getItem.mockReset().mockResolvedValue(null);
    mocks.setItem.mockReset().mockResolvedValue(undefined);
    mocks.hydrateActivity.mockReset().mockResolvedValue(undefined);
    mocks.recordActivity.mockReset().mockResolvedValue(undefined);
  });

  it("waits for old progress before an early answer, preserving both earlier answers and other readers", async () => {
    const oldRead = deferred<unknown>();
    mocks.getItem.mockReturnValue(oldRead.promise);
    const store = await loadStore();
    const answering = store.getState().answerQuestion("reader-a", "a-2", "四");

    expect(store.getState().hydrated).toBe(false);
    expect(mocks.setItem).not.toHaveBeenCalled();
    oldRead.resolve({ progress: {
      "reader-a": { answers: { "a-1": "一" } },
      "reader-b": { completedAt: "2026-10-17T08:00:00.000Z", answers: { "b-1": "七" } },
    } });
    await answering;

    expect(store.getState().progress["reader-a"]?.answers).toEqual({ "a-1": "一", "a-2": "四" });
    expect(store.getState().progress["reader-b"]).toEqual({
      completedAt: "2026-10-17T08:00:00.000Z", answers: { "b-1": "七" },
    });
    expect(mocks.getItem).toHaveBeenCalledTimes(1);
    expect(mocks.setItem).toHaveBeenLastCalledWith("life-readers:v1", {
      progress: store.getState().progress,
    });
  });

  it("shares one read when several pages hydrate concurrently", async () => {
    const oldRead = deferred<unknown>();
    mocks.getItem.mockReturnValue(oldRead.promise);
    const store = await loadStore();
    const first = store.getState().hydrate();
    const second = store.getState().hydrate();
    const third = store.getState().hydrate();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(mocks.getItem).toHaveBeenCalledTimes(1);
    oldRead.resolve({ progress: { "reader-a": { answers: { "a-1": "一" } } } });
    await Promise.all([first, second, third]);
    await store.getState().hydrate();

    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().progress["reader-a"]?.answers["a-1"]).toBe("一");
    expect(mocks.getItem).toHaveBeenCalledTimes(1);
  });

  it("requires every comprehension answer before saving completion, then records activity after hydration", async () => {
    const store = await loadStore();
    await store.getState().completeReader("reader-a");
    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(mocks.recordActivity).not.toHaveBeenCalled();

    await store.getState().answerQuestion("reader-a", "a-1", "二");
    await store.getState().answerQuestion("reader-a", "a-2", "四");
    mocks.setItem.mockClear();
    await store.getState().completeReader("reader-a");
    expect(store.getState().progress["reader-a"]?.completedAt).toBeUndefined();
    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(mocks.recordActivity).not.toHaveBeenCalled();

    await store.getState().answerQuestion("reader-a", "a-3", "五");
    await store.getState().completeReader("reader-a");
    const completed = store.getState().progress["reader-a"];
    if (!completed?.completedAt) throw new Error("Expected the reader and its completion date to be saved");
    expect(completed.completedAt).toEqual(expect.any(String));
    expect(Number.isFinite(Date.parse(completed.completedAt))).toBe(true);
    expect(completed.answers).toEqual({ "a-1": "二", "a-2": "四", "a-3": "五" });
    expect(mocks.setItem).toHaveBeenLastCalledWith("life-readers:v1", {
      progress: { "reader-a": completed },
    });
    expect(mocks.hydrateActivity).toHaveBeenCalledTimes(1);
    expect(mocks.recordActivity).toHaveBeenCalledTimes(1);
    expect(mocks.hydrateActivity.mock.invocationCallOrder[0]!).toBeLessThan(mocks.recordActivity.mock.invocationCallOrder[0]!);
  });

  it("keeps new answers usable in memory without overwriting old storage after a failed read", async () => {
    mocks.getItem.mockRejectedValue(new Error("IndexedDB temporarily unavailable"));
    const store = await loadStore();
    await store.getState().answerQuestion("reader-a", "a-1", "一");
    await store.getState().answerQuestion("reader-a", "a-2", "四");
    await store.getState().answerQuestion("reader-a", "a-3", "五");
    await store.getState().completeReader("reader-a");

    expect(store.getState().hydrated).toBe(true);
    expect(Object.keys(store.getState().progress["reader-a"]?.answers ?? {})).toHaveLength(3);
    expect(store.getState().storageError).toContain("未能读取");
    expect(store.getState().storageError).toContain("不会写入");
    expect(mocks.getItem).toHaveBeenCalledTimes(1);
    expect(mocks.setItem).not.toHaveBeenCalled();
  });
});
