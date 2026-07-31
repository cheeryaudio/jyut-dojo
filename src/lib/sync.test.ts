import { describe, it, expect, vi } from 'vitest';

vi.mock('localforage', () => ({
  default: {
    config: vi.fn(),
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

import { isValidCode, generateCode, sanitizeState } from './sync';

describe('sync codes', () => {
  it('accepts 8-16 char alnum (case-insensitive), rejects junk', () => {
    expect(isValidCode('ABCD1234')).toBe(true);
    expect(isValidCode('abcd1234')).toBe(true);
    expect(isValidCode('ABCD1234ABCD1234')).toBe(true);
    expect(isValidCode('short7')).toBe(false);
    expect(isValidCode('ABCD1234ABCD12345')).toBe(false);
    expect(isValidCode('ABCD-234')).toBe(false);
  });

  it('generates a valid 10-char code with no confusable chars', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[A-Z0-9]{10}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe('sanitizeState — untrusted remote blob', () => {
  it('coerces wrong-typed fields and injects the local sync code', () => {
    const bad = {
      xpLog: 'not-an-object',
      learnedScenarios: [1, 'greet', null],
      tonedrillBest: 'x',
      settings: { syncCode: 'REMOTE-CODE', voice: 'male' },
    };
    const state = sanitizeState(bad, 'CODE123456', 1234);
    expect(state.xpLog).toEqual({});
    expect(state.learnedScenarios).toEqual(['greet']);
    expect(state.tonedrillBest).toBe(0);
    expect(state.settings.syncCode).toBe('CODE123456');
    expect(state.settings.lastSyncAt).toBe(1234);
    expect(state.settings.voice).toBe('male');
  });
});
