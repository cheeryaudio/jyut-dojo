import type { ReviewCard } from '../../types';
import type { WrongItem } from '../../lib/wrongbook';

/** Persisted progress schema version. */
export const PERSIST_VERSION = 4;

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

export interface ProgressData {
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
}
