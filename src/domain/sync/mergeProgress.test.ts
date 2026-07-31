import { describe, expect, it } from 'vitest';
import type { WrongItem } from '../../lib/wrongbook';
import type { ReviewCard } from '../../types';
import { createDefaultProgressData } from '../progress/defaults';
import type { ProgressData, Settings } from '../progress/model';
import { mergeProgress } from './mergeProgress';

type ProgressPatch = Omit<Partial<ProgressData>, 'settings'> & { settings?: Partial<Settings> };

function progress(patch: ProgressPatch = {}): ProgressData {
  const base = createDefaultProgressData();
  return {
    ...base,
    ...patch,
    settings: { ...base.settings, ...(patch.settings ?? {}) },
  };
}

function card(patch: Partial<ReviewCard> = {}): ReviewCard {
  return {
    wordId: 'w1',
    due: '2026-08-01T00:00:00.000Z',
    interval: 5,
    ease: 2.5,
    reps: 5,
    lapses: 0,
    updatedAt: 100,
    ...patch,
  };
}

function wrong(patch: Partial<WrongItem> = {}): WrongItem {
  return {
    id: 'q:s1',
    type: 'quiz',
    refId: 'greet',
    ts: 100,
    correctStreak: 0,
    updatedAt: 100,
    payload: { kind: 'quiz', sentenceId: 's1', scenarioId: 'greet' },
    ...patch,
  };
}

describe('mergeProgress — baseline-aware three-way merge', () => {
  it('adds independent same-day XP deltas and stays idempotent after rebasing', () => {
    const baseline = progress();
    const remote = progress({ xpLog: { '2026-07-21': 40 } });
    const local = progress({ xpLog: { '2026-07-21': 20 } });

    const first = mergeProgress(baseline, remote, local);
    expect(first.xpLog).toEqual({ '2026-07-21': 60 });

    const repeated = mergeProgress(first, first, first);
    expect(repeated.xpLog).toEqual({ '2026-07-21': 60 });
  });

  it('unions completion and never regresses monotonic booleans', () => {
    const merged = mergeProgress(
      progress({ learnedScenarios: ['greet'], grammarVisited: true }),
      progress({ learnedScenarios: ['greet', 'cafe'], grammarVisited: true }),
      progress({ learnedScenarios: ['greet', 'phone'], firstWinDone: true }),
    );
    expect(new Set(merged.learnedScenarios)).toEqual(new Set(['greet', 'cafe', 'phone']));
    expect(merged.grammarVisited).toBe(true);
    expect(merged.firstWinDone).toBe(true);
  });

  it('deduplicates tone answers across repeated device histories', () => {
    const answer = { toneSet: 'si', actual: 2, picked: 5, ts: 1000 };
    const merged = mergeProgress(
      progress({ toneAnswers: [answer] }),
      progress({ toneAnswers: [answer] }),
      progress({ toneAnswers: [answer] }),
    );
    expect(merged.toneAnswers).toEqual([answer]);
  });

  it('preserves a wrong-item deletion against an unchanged stale device', () => {
    const item = wrong();
    const merged = mergeProgress(
      progress({ wrongItems: [item] }),
      progress({ wrongItems: [] }),
      progress({ wrongItems: [item] }),
    );
    expect(merged.wrongItems).toEqual([]);
  });

  it('uses actual correctStreak and latest updatedAt for concurrent wrong-item edits', () => {
    const base = wrong({ correctStreak: 0, updatedAt: 100 });
    const remote = wrong({ correctStreak: 1, updatedAt: 200 });
    const local = wrong({ correctStreak: 0, updatedAt: 300 });
    const merged = mergeProgress(
      progress({ wrongItems: [base] }),
      progress({ wrongItems: [remote] }),
      progress({ wrongItems: [local] }),
    );
    expect(merged.wrongItems[0].correctStreak).toBe(0);
    expect(merged.wrongItems[0].updatedAt).toBe(300);
  });

  it('lets a newer lapse beat an older high-reps card', () => {
    const base = card({ reps: 5, lapses: 0, updatedAt: 100 });
    const newerLapse = card({ reps: 0, lapses: 1, interval: 1, updatedAt: 300 });
    const merged = mergeProgress(
      progress({ reviewCards: { w1: base } }),
      progress({ reviewCards: { w1: newerLapse } }),
      progress({ reviewCards: { w1: base } }),
    );
    expect(merged.reviewCards.w1.reps).toBe(0);
    expect(merged.reviewCards.w1.lapses).toBe(1);
  });

  it('three-way merges settings while keeping local operational sync metadata', () => {
    const baseline = progress({ settings: { voice: 'female', audioSpeed: 'normal', syncCode: 'LOCAL', lastSyncAt: 10 } });
    const remote = progress({ settings: { voice: 'male', audioSpeed: 'normal', syncCode: 'REMOTE', lastSyncAt: 20 } });
    const local = progress({ settings: { voice: 'female', audioSpeed: 'slow', syncCode: 'LOCAL', lastSyncAt: 30 } });
    const merged = mergeProgress(baseline, remote, local);
    expect(merged.settings.voice).toBe('male');
    expect(merged.settings.audioSpeed).toBe('slow');
    expect(merged.settings.syncCode).toBe('LOCAL');
    expect(merged.settings.lastSyncAt).toBe(30);
  });
});
