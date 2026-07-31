import { describe, expect, it } from 'vitest';
import { createDefaultProgressData, DEFAULT_SETTINGS } from './defaults';
import { migrateProgress } from './migrations';

describe('progress migrations', () => {
  it('migrates a representative v1 blob through v2 to v3', () => {
    const migrated = migrateProgress({
      learnedScenarios: ['greet'],
      pinyinDone: ['initials'],
      reviewCards: {
        nei5: {
          wordId: 'nei5',
          due: '2026-08-01T00:00:00.000Z',
          interval: 6,
          ease: 2.4,
          reps: 2,
          lapses: 1,
        },
      },
      activityLog: { '2026-07-20': 2 },
      xpLog: { '2026-07-20': 40 },
      settings: { cardFront: 'audio', dailyGoalMin: 15 },
    }, 1);

    expect(migrated.learnedScenarios).toEqual(['greet']);
    expect(migrated.pinyinDone).toEqual(['initials']);
    expect(migrated.reviewCards.nei5).toMatchObject({ reps: 2, lapses: 1, ease: 2.4 });
    expect(migrated.activityLog).toEqual({ '2026-07-20': 2 });
    expect(migrated.xpLog).toEqual({ '2026-07-20': 40 });
    expect(migrated.grammarVisited).toBe(false);
    expect(migrated.firstWinDone).toBe(false);
    expect(migrated.settings).toEqual({
      ...DEFAULT_SETTINGS,
      cardFront: 'audio',
      dailyGoalMin: 15,
      onboarded: true,
    });
  });

  it('preserves every current v2 field, including grammar and first-win flags', () => {
    const fixture = {
      ...createDefaultProgressData(),
      learnedScenarios: ['cafe'],
      practicedScenarios: ['greet'],
      pinyinDone: ['finals-a'],
      basicsLearned: ['numbers'],
      tonesIntroVisited: true,
      grammarVisited: true,
      firstWinDone: true,
      tonedrillBest: 4,
      quizStars: { cafe: 3 },
      toneAnswers: [{ toneSet: 'si', actual: 1, picked: 2, ts: 100 }],
      activityLog: { '2026-07-21': 1 },
      xpLog: { '2026-07-21': 25 },
      settings: {
        ...DEFAULT_SETTINGS,
        cardFront: 'jyutping' as const,
        dailyGoalMin: 20,
        onboarded: true,
        recommendedStage: 'stage2',
        syncCode: 'CODE123456',
        lastSyncAt: 123456,
        analyticsEnabled: false,
        audioSpeed: 'slow' as const,
        voice: 'male' as const,
        reminderEnabled: true,
        reminderHour: 8,
        reminderMinute: 30,
      },
    };

    expect(migrateProgress(fixture, 2)).toEqual(fixture);
  });

  it('coerces corrupt fields independently and repairs nested items when possible', () => {
    const validToneAnswers = Array.from({ length: 502 }, (_, ts) => ({
      toneSet: 'si',
      actual: 1,
      picked: 2,
      ts,
    }));
    const migrated = migrateProgress({
      learnedScenarios: ['greet', 7, '', 'cafe'],
      practicedScenarios: 'bad',
      pinyinDone: ['initials'],
      basicsLearned: [null, 'numbers'],
      tonesIntroVisited: 'yes',
      grammarVisited: true,
      firstWinDone: null,
      tonedrillBest: Number.POSITIVE_INFINITY,
      quizStars: { greet: 3, bad: 'three', negative: -1 },
      activityLog: { '2026-07-22': 2, bad: null },
      xpLog: 'bad',
      reviewCards: {
        good: {
          wordId: 'good',
          due: '2026-08-01T00:00:00.000Z',
          interval: 6,
          ease: 2.3,
          reps: 3,
          lapses: 1,
        },
        repaired: {
          wordId: 'repaired',
          due: 'not-a-date',
          interval: 'six',
          ease: null,
          reps: 2,
          lapses: -1,
        },
        dropped: null,
      },
      toneAnswers: [
        { toneSet: '', actual: 1, picked: 1, ts: 999 },
        ...validToneAnswers,
        { toneSet: 'si', actual: 9, picked: 1, ts: 1000 },
      ],
      wrongItems: [
        {
          id: 'q:s1',
          type: 'quiz',
          refId: 'greet',
          ts: 9,
          correctStreak: 1,
          payload: { kind: 'quiz', sentenceId: 's1', scenarioId: 'greet' },
        },
        {
          type: 'quiz',
          ts: 'bad',
          correctStreak: -1,
          payload: { kind: 'pinyin', ref: 'initials', jp: 'b' },
        },
        { id: 'bad', type: 'quiz', payload: { kind: 'quiz', sentenceId: 3 } },
      ],
      settings: {
        cardFront: 'picture',
        dailyGoalMin: 25,
        onboarded: false,
        recommendedStage: 2,
        syncCode: 'CODE123456',
        lastSyncAt: 'yesterday',
        analyticsEnabled: 'yes',
        audioSpeed: 'slow',
        voice: 'robot',
        reminderEnabled: true,
        reminderHour: 25,
        reminderMinute: 30,
      },
    }, 2);

    expect(migrated.learnedScenarios).toEqual(['greet', 'cafe']);
    expect(migrated.practicedScenarios).toEqual([]);
    expect(migrated.pinyinDone).toEqual(['initials']);
    expect(migrated.basicsLearned).toEqual(['numbers']);
    expect(migrated.tonesIntroVisited).toBe(false);
    expect(migrated.grammarVisited).toBe(true);
    expect(migrated.firstWinDone).toBe(false);
    expect(migrated.tonedrillBest).toBe(0);
    expect(migrated.quizStars).toEqual({ greet: 3 });
    expect(migrated.activityLog).toEqual({ '2026-07-22': 2 });
    expect(migrated.xpLog).toEqual({});

    expect(migrated.reviewCards.good).toMatchObject({ interval: 6, ease: 2.3, reps: 3, lapses: 1 });
    expect(migrated.reviewCards.repaired).toEqual({
      wordId: 'repaired',
      due: '1970-01-01T00:00:00.000Z',
      interval: 0,
      ease: 2.5,
      reps: 2,
      lapses: 0,
      updatedAt: 0,
    });
    expect(migrated.reviewCards.dropped).toBeUndefined();

    expect(migrated.toneAnswers).toHaveLength(500);
    expect(migrated.toneAnswers[0].ts).toBe(2);
    expect(migrated.toneAnswers[499].ts).toBe(501);

    expect(migrated.wrongItems).toHaveLength(2);
    expect(migrated.wrongItems[0]).toMatchObject({ id: 'q:s1', type: 'quiz', correctStreak: 1 });
    expect(migrated.wrongItems[1]).toEqual({
      id: 'p:initials:b',
      type: 'pinyin',
      refId: 'initials',
      ts: 0,
      correctStreak: 0,
      updatedAt: 0,
      payload: { kind: 'pinyin', ref: 'initials', jp: 'b' },
    });

    expect(migrated.settings).toEqual({
      ...DEFAULT_SETTINGS,
      dailyGoalMin: 25,
      onboarded: false,
      syncCode: 'CODE123456',
      audioSpeed: 'slow',
      reminderEnabled: true,
      reminderMinute: 30,
    });
  });

  it('uses review-card record keys as canonical identities', () => {
    const migrated = migrateProgress({
      reviewCards: {
        good: {
          wordId: 'good',
          due: '2026-08-01T00:00:00.000Z',
          interval: 20,
          ease: 2.5,
          reps: 10,
          lapses: 0,
        },
        damaged: {
          wordId: 'good',
          due: 'not-a-date',
          interval: 0,
          ease: 2.5,
          reps: 0,
          lapses: 0,
        },
      },
    }, 2);

    expect(migrated.reviewCards.good.reps).toBe(10);
    expect(migrated.reviewCards.damaged.wordId).toBe('damaged');
  });

  it('rejects future schema versions instead of downgrading them', () => {
    expect(() => migrateProgress({ futureField: true }, 5)).toThrow('Unsupported progress version: 5');
  });
});
