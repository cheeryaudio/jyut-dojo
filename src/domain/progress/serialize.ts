import type { ProgressData } from './model';

/** Explicitly select the data persisted locally and synced remotely. */
export function selectPersistedProgress(state: ProgressData): ProgressData {
  return {
    learnedScenarios: state.learnedScenarios,
    practicedScenarios: state.practicedScenarios,
    pinyinDone: state.pinyinDone,
    basicsLearned: state.basicsLearned,
    tonesIntroVisited: state.tonesIntroVisited,
    grammarVisited: state.grammarVisited,
    firstWinDone: state.firstWinDone,
    tonedrillBest: state.tonedrillBest,
    quizStars: state.quizStars,
    reviewCards: state.reviewCards,
    toneAnswers: state.toneAnswers,
    activityLog: state.activityLog,
    xpLog: state.xpLog,
    wrongItems: state.wrongItems,
    settings: state.settings,
  };
}
