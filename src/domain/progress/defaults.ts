import type { ProgressData, Settings } from './model';

export const DEFAULT_SETTINGS: Settings = {
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

/** Create fresh mutable containers for a new learner's progress. */
export function createDefaultProgressData(): ProgressData {
  return {
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
    settings: { ...DEFAULT_SETTINGS },
  };
}
