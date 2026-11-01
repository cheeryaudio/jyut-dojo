import localforage from "localforage";
import { create } from "zustand";
import { useActivityStore } from "./activityStore";
import type { DelayedCheck, EvidenceKind, LearningErrorType, LearningEvent, LessonStepId } from "../types/learning";

const EVENTS_KEY = "jyut-dojo:learning-events:v1";
const CHECKS_KEY = "jyut-dojo:delayed-checks:v1";

const masteryStorage = localforage.createInstance({ name: "jyut-dojo", storeName: "mastery", description: "Learning evidence and delayed checks" });

interface RecordEvidenceInput {
  unitId: string;
  capabilityIds: string[];
  stepId: LessonStepId;
  kind: EvidenceKind;
  score: number;
  errorType?: LearningErrorType;
}

interface MasteryState {
  events: LearningEvent[];
  delayedChecks: DelayedCheck[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  recordEvidence: (input: RecordEvidenceInput) => Promise<void>;
  scheduleDelayedCheck: (unitId: string, now?: Date) => Promise<void>;
  completeDelayedCheck: (unitId: string, score: number, capabilityIds: string[], now?: Date) => Promise<void>;
  importMasteryData: (events: LearningEvent[], delayedChecks: DelayedCheck[], mode?: "merge" | "replace") => Promise<void>;
}

export const useMasteryStore = create<MasteryState>((set, get) => ({
  events: [],
  delayedChecks: [],
  hydrated: false,
  hydrate: async () => {
    const [events, delayedChecks] = await Promise.all([
      masteryStorage.getItem<LearningEvent[]>(EVENTS_KEY),
      masteryStorage.getItem<DelayedCheck[]>(CHECKS_KEY),
    ]);
    set({ events: events ?? [], delayedChecks: delayedChecks ?? [], hydrated: true });
  },
  recordEvidence: async (input) => {
    const event: LearningEvent = {
      ...input,
      score: Math.max(0, Math.min(100, Math.round(input.score))),
      id: `${input.unitId}:${input.stepId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const events = [...get().events, event];
    set({ events });
    await Promise.all([masteryStorage.setItem(EVENTS_KEY, events), useActivityStore.getState().recordActivity()]);
  },
  scheduleDelayedCheck: async (unitId, now = new Date()) => {
    const due = new Date(now);
    due.setDate(due.getDate() + 1);
    const existing = get().delayedChecks.filter((check) => check.unitId !== unitId || check.completedAt !== undefined);
    const delayedChecks = [...existing, { unitId, due: due.toISOString() }];
    set({ delayedChecks });
    await masteryStorage.setItem(CHECKS_KEY, delayedChecks);
  },
  completeDelayedCheck: async (unitId, score, capabilityIds, now = new Date()) => {
    const delayedChecks = get().delayedChecks.map((check) => check.unitId === unitId && check.completedAt === undefined ? { ...check, completedAt: now.toISOString() } : check);
    set({ delayedChecks });
    await Promise.all([
      masteryStorage.setItem(CHECKS_KEY, delayedChecks),
      get().recordEvidence({ unitId, capabilityIds, stepId: "delayed", kind: "review", score }),
    ]);
  },
  importMasteryData: async (incomingEvents, incomingChecks, mode = "merge") => {
    if (!get().hydrated) await get().hydrate();
    const eventsById = new Map<string, LearningEvent>();
    if (mode !== "replace") {
      for (const ev of get().events) eventsById.set(ev.id, ev);
    }
    for (const ev of incomingEvents) {
      if (ev && typeof ev.id === "string") eventsById.set(ev.id, ev);
    }
    const mergedEvents = [...eventsById.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const mergedChecks = mode === "replace"
      ? incomingChecks
      : [...get().delayedChecks, ...incomingChecks.filter(inc => !get().delayedChecks.some(cur => cur.unitId === inc.unitId && cur.due === inc.due))];
    set({ events: mergedEvents, delayedChecks: mergedChecks });
    await Promise.all([
      masteryStorage.setItem(EVENTS_KEY, mergedEvents),
      masteryStorage.setItem(CHECKS_KEY, mergedChecks),
    ]);
  },
}));
