import { describe, expect, it } from 'vitest';
import { createDefaultProgressData } from './defaults';
import { selectPersistedProgress } from './serialize';

const PERSISTED_KEYS = [
  'learnedScenarios',
  'practicedScenarios',
  'pinyinDone',
  'basicsLearned',
  'tonesIntroVisited',
  'grammarVisited',
  'firstWinDone',
  'tonedrillBest',
  'quizStars',
  'reviewCards',
  'toneAnswers',
  'activityLog',
  'xpLog',
  'wrongItems',
  'settings',
].sort();

describe('selectPersistedProgress', () => {
  it('selects exactly ProgressData and excludes actions and hydration state', () => {
    const data = {
      ...createDefaultProgressData(),
      learnedScenarios: ['greet'],
      grammarVisited: true,
    };
    const storeLike = {
      ...data,
      hasHydrated: true,
      setHasHydrated: () => undefined,
      completeLesson: () => undefined,
      resetAll: () => undefined,
      unrelated: 'do not persist',
    };

    const selected = selectPersistedProgress(storeLike);

    expect(Object.keys(selected).sort()).toEqual(PERSISTED_KEYS);
    expect(selected).toEqual(data);
    expect('hasHydrated' in selected).toBe(false);
    expect('completeLesson' in selected).toBe(false);
    expect('unrelated' in selected).toBe(false);
  });

  it('works with fresh independent default containers', () => {
    const first = createDefaultProgressData();
    const second = createDefaultProgressData();
    first.learnedScenarios.push('greet');
    first.settings.dailyGoalMin = 20;

    expect(selectPersistedProgress(second).learnedScenarios).toEqual([]);
    expect(second.settings.dailyGoalMin).toBe(10);
  });
});
