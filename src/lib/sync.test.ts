import { describe, it, expect } from 'vitest';
import { isValidCode, generateCode, mergeProgress, sanitizeState } from './sync';

describe('sync codes', () => {
  it('accepts 8-16 char alnum (case-insensitive), rejects junk', () => {
    expect(isValidCode('ABCD1234')).toBe(true);
    expect(isValidCode('abcd1234')).toBe(true); // normalized to upper
    expect(isValidCode('ABCD1234ABCD1234')).toBe(true); // 16 max
    expect(isValidCode('short7')).toBe(false);
    expect(isValidCode('ABCD1234ABCD12345')).toBe(false);
    expect(isValidCode('ABCD-234')).toBe(false);
  });
  it('generates a valid 10-char code with no confusable chars', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[A-Z0-9]{10}$/);
      expect(c).not.toMatch(/[01OI]/);
    }
  });
});

describe('mergeProgress — two-device union (no data loss)', () => {
  it('unions learned scenarios and maxes per-day xp', () => {
    const remote = { learnedScenarios: ['greet'], xpLog: { '2026-07-21': 40 }, quizStars: { greet: 3 } };
    const local = { learnedScenarios: ['cafe'], xpLog: { '2026-07-21': 20, '2026-07-22': 15 }, quizStars: { greet: 2, cafe: 1 } };
    const m = mergeProgress(remote, local);
    expect((m.learnedScenarios as string[]).sort()).toEqual(['cafe', 'greet']);
    expect(m.xpLog).toEqual({ '2026-07-21': 40, '2026-07-22': 15 });
    expect(m.quizStars).toEqual({ greet: 3, cafe: 1 });
  });

  it('keeps the more-progressed review card', () => {
    const remote = { reviewCards: { w1: { wordId: 'w1', reps: 5, due: '2026-08-01' } } };
    const local = { reviewCards: { w1: { wordId: 'w1', reps: 2, due: '2026-07-25' } } };
    const m = mergeProgress(remote, local) as { reviewCards: Record<string, { reps: number }> };
    expect(m.reviewCards.w1.reps).toBe(5);
  });

  it('unions wrong items by id, keeping the one closer to retirement', () => {
    const remote = { wrongItems: [{ id: 'a', correctCount: 0 }, { id: 'b', correctCount: 1 }] };
    const local = { wrongItems: [{ id: 'a', correctCount: 1 }] };
    const m = mergeProgress(remote, local) as { wrongItems: { id: string; correctCount: number }[] };
    expect(m.wrongItems.find((x) => x.id === 'a')?.correctCount).toBe(1);
    expect(m.wrongItems.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('caps merged toneAnswers at 500 newest', () => {
    const remote = { toneAnswers: Array.from({ length: 400 }, (_, i) => ({ ts: i })) };
    const local = { toneAnswers: Array.from({ length: 400 }, (_, i) => ({ ts: 1000 + i })) };
    const m = mergeProgress(remote, local) as { toneAnswers: { ts: number }[] };
    expect(m.toneAnswers.length).toBe(500);
    expect(m.toneAnswers[m.toneAnswers.length - 1].ts).toBe(1399);
  });

  it('prefers local settings and ORs boolean flags', () => {
    const m = mergeProgress(
      { settings: { voice: 'female' }, tonesIntroVisited: true },
      { settings: { voice: 'male' }, tonesIntroVisited: false },
    ) as { settings: { voice: string }; tonesIntroVisited: boolean };
    expect(m.settings.voice).toBe('male');
    expect(m.tonesIntroVisited).toBe(true);
  });
});

describe('sanitizeState — untrusted remote blob', () => {
  it('coerces wrong-typed fields and injects the code', () => {
    const bad = { xpLog: 'not-an-object', learnedScenarios: [1, 'greet', null], tonedrillBest: 'x' };
    const s = sanitizeState(bad, 'CODE123456');
    expect(s.xpLog).toEqual({});
    expect(s.learnedScenarios).toEqual(['greet']);
    expect(s.tonedrillBest).toBe(0);
    expect((s.settings as { syncCode: string }).syncCode).toBe('CODE123456');
  });
});
