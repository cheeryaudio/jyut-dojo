import localforage from "localforage";
import { create } from "zustand";
import { readerById } from "../data/readers";
import { useActivityStore } from "./activityStore";

export interface ReaderProgress {
  completedAt?: string;
  answers: Record<string, string>;
}

interface ReaderState {
  progress: Record<string, ReaderProgress>;
  hydrated: boolean;
  storageError: string;
  hydrate: () => Promise<void>;
  answerQuestion: (readerId: string, questionId: string, answer: string) => Promise<void>;
  completeReader: (readerId: string) => Promise<void>;
  importReaderData: (progress: unknown, mode?: "merge" | "replace") => Promise<void>;
}

const storage = localforage.createInstance({
  name: "jyut-dojo",
  storeName: "readers",
  description: "Life readers and comprehension answers",
});
const STORAGE_KEY = "life-readers:v1";

export function readProgress(value: unknown): Record<string, ReaderProgress> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, ReaderProgress> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!readerById.has(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as { completedAt?: unknown; answers?: unknown };
    const answers: Record<string, string> = {};
    if (entry.answers && typeof entry.answers === "object" && !Array.isArray(entry.answers)) {
      const reader = readerById.get(id)!;
      for (const question of reader.questions) {
        const answer = (entry.answers as Record<string, unknown>)[question.id];
        if (typeof answer === "string" && question.options.includes(answer)) answers[question.id] = answer;
      }
    }
    const completedAt = typeof entry.completedAt === "string" && Number.isFinite(Date.parse(entry.completedAt))
      ? entry.completedAt : undefined;
    result[id] = { answers, ...(completedAt ? { completedAt } : {}) };
  }
  return result;
}

export const useReaderStore = create<ReaderState>((set, get) => {
  let hydration: Promise<void> | null = null;
  let saving: Promise<void> = Promise.resolve();
  let canPersist = true;

  const persist = async () => {
    // A failed read must never replace an existing saved history with empty state.
    if (!canPersist) return;
    const snapshot = { progress: get().progress };
    saving = saving.then(async () => {
      await storage.setItem(STORAGE_KEY, snapshot);
      set({ storageError: "" });
    }).catch(() => {
      set({ storageError: "未能保存短读记录。你仍可继续阅读，本次作答暂时保留在当前页面中。" });
    });
    await saving;
  };

  return {
    progress: {},
    hydrated: false,
    storageError: "",
    hydrate: () => {
      if (get().hydrated) return Promise.resolve();
      if (hydration) return hydration;
      hydration = (async () => {
        try {
          const saved = await storage.getItem<{ progress?: unknown }>(STORAGE_KEY);
          set({ progress: readProgress(saved?.progress) });
        } catch {
          canPersist = false;
          set({ storageError: "未能读取本机短读记录。你仍可阅读和作答，本次记录暂时不会写入本机；请稍后重新打开页面。" });
        } finally {
          set({ hydrated: true });
        }
      })();
      return hydration;
    },
    answerQuestion: async (readerId, questionId, answer) => {
      await get().hydrate();
      const question = readerById.get(readerId)?.questions.find(item => item.id === questionId);
      if (!question || (answer !== "" && !question.options.includes(answer))) return;
      const previous = get().progress[readerId] ?? { answers: {} };
      const answers = { ...previous.answers };
      if (answer) answers[questionId] = answer;
      else delete answers[questionId];
      set({ progress: { ...get().progress, [readerId]: { ...previous, answers } } });
      await persist();
    },
    completeReader: async readerId => {
      await get().hydrate();
      const reader = readerById.get(readerId);
      const previous = get().progress[readerId];
      if (!reader || !previous || !reader.questions.every(question => Boolean(previous.answers[question.id]))) return;
      set({ progress: { ...get().progress, [readerId]: { ...previous, completedAt: previous.completedAt ?? new Date().toISOString() } } });
      await persist();
      try {
        await useActivityStore.getState().hydrate();
        await useActivityStore.getState().recordActivity();
      } catch {
        set({ storageError: "短读已在当前页面标为读完，但未能更新本机学习日历。" });
      }
    },
    importReaderData: async (rawProgress, mode = "merge") => {
      await get().hydrate();
      const sanitized = readProgress(rawProgress);
      if (mode === "replace") {
        set({ progress: sanitized });
        await persist();
        return;
      }
      const next: Record<string, ReaderProgress> = { ...get().progress };
      for (const [readerId, inc] of Object.entries(sanitized)) {
        const cur = next[readerId];
        if (!cur) {
          next[readerId] = inc;
          continue;
        }
        const reader = readerById.get(readerId);
        const correctByQId = new Map(reader?.questions.map(q => [q.id, q.answer]) ?? []);
        const answers: Record<string, string> = { ...cur.answers };
        for (const [qId, incAns] of Object.entries(inc.answers)) {
          const curAns = answers[qId];
          if (!curAns || (curAns !== correctByQId.get(qId) && incAns === correctByQId.get(qId))) {
            answers[qId] = incAns;
          }
        }
        let completedAt = cur.completedAt ?? inc.completedAt;
        if (cur.completedAt && inc.completedAt) {
          completedAt = Date.parse(inc.completedAt) < Date.parse(cur.completedAt) ? inc.completedAt : cur.completedAt;
        }
        next[readerId] = { answers, ...(completedAt ? { completedAt } : {}) };
      }
      set({ progress: next });
      await persist();
    },
  };
});
