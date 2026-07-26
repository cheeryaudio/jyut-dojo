import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage, type PersistStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { ReviewCard } from '../types';
import { createCard, schedule, type Grade } from '../lib/srs';
import { scenarioVocab } from '../lib/data';
import { dayKey } from '../lib/dates';
import { addXp, XP } from '../lib/xp';
import {
  addWrong,
  gradeWrong,
  clearWrong,
  type WrongItem,
  type WrongType,
  type WrongPayload,
} from '../lib/wrongbook';
import type { PathProgress } from '../lib/path';

/** Single source of truth for the persisted-state schema version. */
export const PERSIST_VERSION = 2;
/** Cap on the raw tone-answer log so the synced blob can never grow unbounded. */
const TONE_ANSWERS_CAP = 500;

export type CardFront = 'audio' | 'hanzi' | 'jyutping';
export type AudioSpeed = 'normal' | 'slow';
export type Voice = 'female' | 'male';

export interface ToneAnswer {
  toneSet: string;
  actual: number;
  picked: number;
  ts: number;
}

export interface Settings {
  cardFront: CardFront;
  /** daily goal in minutes; XP target = minutes × 10 */
  dailyGoalMin: number;
  /** false until the onboarding flow has been completed once */
  onboarded: boolean;
  /** stage the onboarding suggested the learner start near (soft hint) */
  recommendedStage: string;
  /** 雲端同步 code ('' = not set up) */
  syncCode: string;
  /** epoch ms of the last successful push (0 = never) */
  lastSyncAt: number;
  /** 匿名使用統計 — send anonymous usage events (default on) */
  analyticsEnabled: boolean;
  /** 語速 — normal (1×) or slow (0.72×) playback */
  audioSpeed: AudioSpeed;
  /** 聲音 — sentence voice: female or male */
  voice: Voice;
  /** 每日提醒 (native only) */
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

const DEFAULT_SETTINGS: Settings = {
  cardFront: 'hanzi',
  dailyGoalMin: 10,
  onboarded: false,
  recommendedStage: 'stage0',
  syncCode: '',
  lastSyncAt: 0,
  analyticsEnabled: true,
  audioSpeed: 'normal',
  voice: 'female',
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
};

interface ProgressState {
  learnedScenarios: string[];
  practicedScenarios: string[];
  pinyinDone: string[];
  basicsLearned: string[];
  tonesIntroVisited: boolean;
  /** true once the 句型 (grammar) page has been opened — marks its path unit done */
  grammarVisited: boolean;
  /** true once the 60-second first-win mini-flow has been completed */
  firstWinDone: boolean;
  tonedrillBest: number;
  quizStars: Record<string, number>;
  reviewCards: Record<string, ReviewCard>;
  toneAnswers: ToneAnswer[];
  activityLog: Record<string, number>;
  xpLog: Record<string, number>;
  wrongItems: WrongItem[];
  settings: Settings;

  // learning-event actions
  completeLesson: (scenarioId: string) => void;
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

  // v3 settings
  setSyncCode: (code: string) => void;
  setLastSyncAt: (ts: number) => void;
  setAnalyticsEnabled: (on: boolean) => void;
  setAudioSpeed: (speed: AudioSpeed) => void;
  setVoice: (voice: Voice) => void;
  setReminder: (enabled: boolean, hour: number, minute: number) => void;
}

localforage.config({ name: 'jyut-dojo', storeName: 'progress' });

const forageStorage: StateStorage = {
  getItem: (name) => localforage.getItem<string>(name).then((v) => v ?? null),
  setItem: (name, value) => localforage.setItem(name, value).then(() => undefined),
  removeItem: (name) => localforage.removeItem(name),
};

function bumpToday(log: Record<string, number>): Record<string, number> {
  const key = dayKey();
  return { ...log, [key]: (log[key] ?? 0) + 1 };
}

function withUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

/** Snapshot the fields the path unlock logic needs. */
export function pathProgress(s: ProgressState): PathProgress {
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
  persist(
    (set, get) => ({
      learnedScenarios: [],
      practicedScenarios: [],
      pinyinDone: [],
      basicsLearned: [],
      tonesIntroVisited: false,
      grammarVisited: false,
      firstWinDone: false,
      tonedrillBest: 0,
      quizStars: {},
      reviewCards: {},
      toneAnswers: [],
      activityLog: {},
      xpLog: {},
      wrongItems: [],
      settings: DEFAULT_SETTINGS,

      addWords: (wordIds) =>
        set((state) => {
          const cards = { ...state.reviewCards };
          for (const id of wordIds) if (!cards[id]) cards[id] = createCard(id);
          return { reviewCards: cards };
        }),

      completeLesson: (scenarioId) =>
        set((state) => {
          const cards = { ...state.reviewCards };
          for (const id of scenarioVocab(scenarioId)) if (!cards[id]) cards[id] = createCard(id);
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
            // keep only the most recent N so the persisted/synced blob stays bounded
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
          settings: { ...state.settings, reminderEnabled: enabled, reminderHour: hour, reminderMinute: minute },
        })),

      resetAll: () =>
        set({
          learnedScenarios: [],
          practicedScenarios: [],
          pinyinDone: [],
          basicsLearned: [],
          tonesIntroVisited: false,
          grammarVisited: false,
          firstWinDone: false,
          tonedrillBest: 0,
          quizStars: {},
          reviewCards: {},
          toneAnswers: [],
          activityLog: {},
          xpLog: {},
          wrongItems: [],
          settings: { ...DEFAULT_SETTINGS, cardFront: get().settings.cardFront, onboarded: true },
        }),
    }),
    {
      name: 'jyut-dojo',
      storage: createJSONStorage(() => forageStorage) as PersistStorage<ProgressState>,
      version: PERSIST_VERSION,
      // Preserve a v1 blob across the bump; `merge` back-fills the new fields.
      // Existing users are treated as already-onboarded so they don't get the
      // first-launch flow (fresh installs start with onboarded:false).
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        return {
          ...p,
          settings: { ...DEFAULT_SETTINGS, onboarded: true, ...(p.settings ?? {}) },
        } as ProgressState;
      },
      // Deep-merge so a v1 persisted blob (missing the new fields) gains the
      // defaults instead of crashing — new top-level keys and nested settings
      // are back-filled from the initializer.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
        };
      },
    }
  )
);
