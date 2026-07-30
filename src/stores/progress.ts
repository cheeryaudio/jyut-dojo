import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createCard, schedule, type Grade } from '../lib/srs';
import { dayKey } from '../lib/dates';
import { addXp, XP } from '../lib/xp';
import {
  addWrong,
  gradeWrong,
  clearWrong,
  type WrongType,
  type WrongPayload,
} from '../lib/wrongbook';
import type { PathProgress } from '../lib/path';
import {
  PERSIST_VERSION,
  type AudioSpeed,
  type CardFront,
  type ProgressData,
  type Voice,
} from '../domain/progress/model';
import { createDefaultProgressData, DEFAULT_SETTINGS } from '../domain/progress/defaults';
import { coerceProgressData, migrateProgress } from '../domain/progress/migrations';
import { selectPersistedProgress } from '../domain/progress/serialize';
import { PERSIST_KEY, progressStorage } from '../infrastructure/storage/progressStorage';

export { PERSIST_VERSION } from '../domain/progress/model';
export type {
  AudioSpeed,
  CardFront,
  ProgressData,
  Settings,
  ToneAnswer,
  Voice,
} from '../domain/progress/model';

/** Cap on the raw tone-answer log so the synced blob can never grow unbounded. */
const TONE_ANSWERS_CAP = 500;

export interface ProgressActions {
  // learning-event actions
  completeLesson: (scenarioId: string, wordIds: string[]) => void;
  completePractice: (scenarioId: string) => void;
  markPinyinDone: (ref: string) => void;
  markBasicsLearned: (deckId: string, wordIds: string[]) => void;
  visitTonesIntro: () => void;
  visitGrammar: () => void;
  completeFirstWin: () => void;
  recordToneDrillLevel: (level: number) => void;
  addWords: (wordIds: string[]) => void;
  recordQuiz: (scenarioId: string, stars: number) => void;
  awardXp: (amount: number) => void;
  bumpActivity: () => void;
  gradeReview: (wordId: string, grade: Grade) => void;
  recordToneAnswer: (toneSet: string, actual: number, picked: number) => void;

  // wrong-answer book
  recordWrong: (type: WrongType, refId: string, payload: WrongPayload) => void;
  gradeWrongItem: (id: string, correct: boolean) => void;
  clearWrongItem: (id: string) => void;

  // settings / onboarding
  setCardFront: (front: CardFront) => void;
  setDailyGoal: (minutes: number) => void;
  completeOnboarding: (dailyGoalMin: number, recommendedStage: string) => void;
  restartOnboarding: () => void;
  resetAll: () => void;
  setSyncCode: (code: string) => void;
  setLastSyncAt: (ts: number) => void;
  setAnalyticsEnabled: (on: boolean) => void;
  setAudioSpeed: (speed: AudioSpeed) => void;
  setVoice: (voice: Voice) => void;
  setReminder: (enabled: boolean, hour: number, minute: number) => void;
}

export interface ProgressState extends ProgressData, ProgressActions {
  /** true after persisted progress has hydrated successfully */
  hasHydrated: boolean;
  /** true when persisted progress could not be read or migrated safely */
  hydrationError: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  setHydrationError: (hydrationError: boolean) => void;
}

function bumpToday(log: Record<string, number>): Record<string, number> {
  const key = dayKey();
  return { ...log, [key]: (log[key] ?? 0) + 1 };
}

function withUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

/** Snapshot the fields the path unlock logic needs. */
export function pathProgress(s: ProgressData): PathProgress {
  return {
    learnedScenarios: s.learnedScenarios,
    pinyinDone: s.pinyinDone,
    basicsLearned: s.basicsLearned,
    tonesIntroVisited: s.tonesIntroVisited,
    grammarVisited: s.grammarVisited,
    tonedrillBest: s.tonedrillBest,
    recommendedStage: s.settings.recommendedStage,
  };
}

export const useProgress = create<ProgressState>()(
  persist<ProgressState, [], [], ProgressData>(
    (set, get) => ({
      ...createDefaultProgressData(),
      hasHydrated: false,
      hydrationError: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setHydrationError: (hydrationError) => set({ hydrationError }),

      addWords: (wordIds) =>
        set((state) => {
          const cards = { ...state.reviewCards };
          for (const id of wordIds) if (!cards[id]) cards[id] = createCard(id);
          return { reviewCards: cards };
        }),

      completeLesson: (scenarioId, wordIds) =>
        set((state) => {
          const cards = { ...state.reviewCards };
          for (const id of wordIds) if (!cards[id]) cards[id] = createCard(id);
          return {
            learnedScenarios: withUnique(state.learnedScenarios, scenarioId),
            reviewCards: cards,
            activityLog: bumpToday(state.activityLog),
            xpLog: addXp(state.xpLog, XP.lesson),
          };
        }),

      completePractice: (scenarioId) =>
        set((state) => ({
          practicedScenarios: withUnique(state.practicedScenarios, scenarioId),
          activityLog: bumpToday(state.activityLog),
        })),

      markPinyinDone: (ref) =>
        set((state) => ({
          pinyinDone: withUnique(state.pinyinDone, ref),
          activityLog: bumpToday(state.activityLog),
        })),

      markBasicsLearned: (deckId, wordIds) =>
        set((state) => {
          const cards = { ...state.reviewCards };
          for (const id of wordIds) if (!cards[id]) cards[id] = createCard(id);
          const alreadyLearned = state.basicsLearned.includes(deckId);
          return {
            basicsLearned: withUnique(state.basicsLearned, deckId),
            reviewCards: cards,
            activityLog: bumpToday(state.activityLog),
            xpLog: alreadyLearned ? state.xpLog : addXp(state.xpLog, XP.basicsDeck),
          };
        }),

      visitTonesIntro: () =>
        set((state) => (state.tonesIntroVisited ? {} : { tonesIntroVisited: true })),

      visitGrammar: () =>
        set((state) => (state.grammarVisited ? {} : { grammarVisited: true })),

      completeFirstWin: () =>
        set((state) =>
          state.firstWinDone
            ? {}
            : { firstWinDone: true, activityLog: bumpToday(state.activityLog) }
        ),

      recordToneDrillLevel: (level) =>
        set((state) => (level > state.tonedrillBest ? { tonedrillBest: level } : {})),

      recordQuiz: (scenarioId, stars) =>
        set((state) => ({
          quizStars: {
            ...state.quizStars,
            [scenarioId]: Math.max(state.quizStars[scenarioId] ?? 0, stars),
          },
        })),

      awardXp: (amount) => set((state) => ({ xpLog: addXp(state.xpLog, amount) })),

      bumpActivity: () => set((state) => ({ activityLog: bumpToday(state.activityLog) })),

      gradeReview: (wordId, grade) =>
        set((state) => {
          const card = state.reviewCards[wordId];
          if (!card) return {};
          return {
            reviewCards: { ...state.reviewCards, [wordId]: schedule(card, grade) },
            activityLog: bumpToday(state.activityLog),
            xpLog: addXp(state.xpLog, XP.reviewGrade),
          };
        }),

      recordToneAnswer: (toneSet, actual, picked) =>
        set((state) => {
          const next = [...state.toneAnswers, { toneSet, actual, picked, ts: Date.now() }];
          return {
            toneAnswers: next.length > TONE_ANSWERS_CAP ? next.slice(-TONE_ANSWERS_CAP) : next,
            activityLog: bumpToday(state.activityLog),
            xpLog: picked === actual ? addXp(state.xpLog, XP.toneDrillCorrect) : state.xpLog,
          };
        }),

      recordWrong: (type, refId, payload) =>
        set((state) => ({ wrongItems: addWrong(state.wrongItems, { type, refId, payload }) })),

      gradeWrongItem: (id, correct) =>
        set((state) => ({
          wrongItems: gradeWrong(state.wrongItems, id, correct),
          activityLog: bumpToday(state.activityLog),
        })),

      clearWrongItem: (id) =>
        set((state) => ({ wrongItems: clearWrong(state.wrongItems, id) })),

      setCardFront: (front) =>
        set((state) => ({ settings: { ...state.settings, cardFront: front } })),

      setDailyGoal: (minutes) =>
        set((state) => ({ settings: { ...state.settings, dailyGoalMin: minutes } })),

      completeOnboarding: (dailyGoalMin, recommendedStage) =>
        set((state) => ({
          settings: { ...state.settings, dailyGoalMin, recommendedStage, onboarded: true },
        })),

      restartOnboarding: () =>
        set((state) => ({ settings: { ...state.settings, onboarded: false } })),

      setSyncCode: (code) =>
        set((state) => ({ settings: { ...state.settings, syncCode: code } })),

      setLastSyncAt: (ts) =>
        set((state) => ({ settings: { ...state.settings, lastSyncAt: ts } })),

      setAnalyticsEnabled: (on) =>
        set((state) => ({ settings: { ...state.settings, analyticsEnabled: on } })),

      setAudioSpeed: (speed) =>
        set((state) => ({ settings: { ...state.settings, audioSpeed: speed } })),

      setVoice: (voice) =>
        set((state) => ({ settings: { ...state.settings, voice } })),

      setReminder: (enabled, hour, minute) =>
        set((state) => ({
          settings: {
            ...state.settings,
            reminderEnabled: enabled,
            reminderHour: hour,
            reminderMinute: minute,
          },
        })),

      resetAll: () => {
        const defaults = createDefaultProgressData();
        set({
          ...defaults,
          settings: {
            ...DEFAULT_SETTINGS,
            cardFront: get().settings.cardFront,
            onboarded: true,
          },
        });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage<ProgressData>(() => progressStorage),
      version: PERSIST_VERSION,
      partialize: selectPersistedProgress,
      migrate: migrateProgress,
      merge: (persisted, current) => ({
        ...current,
        ...coerceProgressData(persisted),
        hasHydrated: false,
        hydrationError: false,
      }),
      onRehydrateStorage: (state) => (_rehydratedState, error) => {
        if (error) state.setHydrationError(true);
        else state.setHasHydrated(true);
      },
    },
  )
);
