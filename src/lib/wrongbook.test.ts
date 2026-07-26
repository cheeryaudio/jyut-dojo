import { describe, it, expect } from 'vitest';
import {
  addWrong,
  gradeWrong,
  clearWrong,
  countByType,
  wrongId,
  type WrongItem,
} from './wrongbook';

describe('wrongId', () => {
  it('is stable per logical item', () => {
    expect(wrongId({ kind: 'quiz', sentenceId: 'k1', scenarioId: 'market' })).toBe('q:k1');
    expect(wrongId({ kind: 'pinyin', ref: 'initials', jp: 'ng' })).toBe('p:initials:ng');
    expect(wrongId({ kind: 'tonedrill', toneSet: 'si', actual: 4 })).toBe('t:si:4');
  });
});

describe('addWrong', () => {
  it('adds a new item', () => {
    const items = addWrong([], {
      type: 'quiz',
      refId: 'market',
      payload: { kind: 'quiz', sentenceId: 'k1', scenarioId: 'market' },
      ts: 1,
    });
    expect(items).toHaveLength(1);
    expect(items[0].correctStreak).toBe(0);
  });

  it('dedupes and resets streak instead of duplicating', () => {
    let items = addWrong([], {
      type: 'pinyin',
      refId: 'initials',
      payload: { kind: 'pinyin', ref: 'initials', jp: 'ng' },
      ts: 1,
    });
    items = gradeWrong(items, 'p:initials:ng', true); // streak 1
    items = addWrong(items, {
      type: 'pinyin',
      refId: 'initials',
      payload: { kind: 'pinyin', ref: 'initials', jp: 'ng' },
      ts: 2,
    });
    expect(items).toHaveLength(1);
    expect(items[0].correctStreak).toBe(0);
    expect(items[0].ts).toBe(2);
  });
});

describe('gradeWrong', () => {
  const seed: WrongItem[] = [
    { id: 't:si:4', type: 'tonedrill', refId: 'si', ts: 1, correctStreak: 0, payload: { kind: 'tonedrill', toneSet: 'si', actual: 4 } },
  ];
  it('removes after two correct in a row', () => {
    let items = gradeWrong(seed, 't:si:4', true);
    expect(items[0].correctStreak).toBe(1);
    items = gradeWrong(items, 't:si:4', true);
    expect(items).toHaveLength(0);
  });
  it('resets streak on a wrong answer', () => {
    let items = gradeWrong(seed, 't:si:4', true);
    items = gradeWrong(items, 't:si:4', false);
    expect(items[0].correctStreak).toBe(0);
  });
});

describe('clearWrong / countByType', () => {
  it('clears one and counts by type', () => {
    let items = addWrong([], { type: 'quiz', refId: 'm', payload: { kind: 'quiz', sentenceId: 'k1', scenarioId: 'm' } });
    items = addWrong(items, { type: 'pinyin', refId: 'initials', payload: { kind: 'pinyin', ref: 'initials', jp: 'b' } });
    expect(countByType(items)).toEqual({ quiz: 1, pinyin: 1, tonedrill: 0, cloze: 0, dictation: 0 });
    items = clearWrong(items, 'q:k1');
    expect(countByType(items)).toEqual({ quiz: 0, pinyin: 1, tonedrill: 0, cloze: 0, dictation: 0 });
  });
});
