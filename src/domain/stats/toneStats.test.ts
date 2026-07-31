import { describe, expect, it } from 'vitest';
import { confusionPairs, toneAccuracy, tonePairKey } from './toneStats';
import type { ToneAnswer } from '../progress/model';

const TONES = [1, 2, 3, 4, 5, 6];

function answer(actual: number, picked: number): ToneAnswer {
  return { toneSet: 'si', actual, picked, ts: 0 };
}

describe('toneAccuracy', () => {
  it('reports every tone, including untouched ones', () => {
    const rows = toneAccuracy([answer(2, 2), answer(2, 5)], TONES);
    expect(rows.map((row) => row.tone)).toEqual(TONES);
    const tone2 = rows.find((row) => row.tone === 2);
    expect(tone2).toMatchObject({ total: 2, correct: 1, percent: 50 });
    expect(rows.find((row) => row.tone === 4)).toMatchObject({ total: 0, correct: 0, percent: 0 });
  });

  it('buckets by the tone that was actually played, not the pick', () => {
    const rows = toneAccuracy([answer(3, 6), answer(3, 6), answer(6, 6)], TONES);
    expect(rows.find((row) => row.tone === 3)).toMatchObject({ total: 2, correct: 0 });
    expect(rows.find((row) => row.tone === 6)).toMatchObject({ total: 1, correct: 1, percent: 100 });
  });
});

describe('tonePairKey', () => {
  it('is order independent', () => {
    expect(tonePairKey(5, 2)).toBe(tonePairKey(2, 5));
    expect(tonePairKey(2, 5)).toBe('2v5');
  });
});

describe('confusionPairs', () => {
  it('only surfaces pairs that were actually confused', () => {
    const pairs = confusionPairs([answer(2, 5), answer(5, 2), answer(1, 1)]);
    expect(pairs.map((pair) => pair.key)).toEqual(['2v5']);
    expect(pairs[0]).toMatchObject({ a: 2, b: 5, total: 2, correct: 0, percent: 0 });
  });

  it('counts correct answers that stayed inside the pair', () => {
    const pairs = confusionPairs([answer(3, 6), answer(3, 3), answer(6, 6), answer(6, 6)]);
    expect(pairs[0]).toMatchObject({ key: '3v6', total: 4, correct: 3, percent: 75 });
  });

  it('sorts the weakest pair first', () => {
    const pairs = confusionPairs([
      answer(2, 5),
      answer(2, 5),
      answer(3, 6),
      answer(3, 3),
      answer(6, 6),
    ]);
    expect(pairs.map((pair) => pair.key)).toEqual(['2v5', '3v6']);
  });

  it('returns nothing when every answer was right', () => {
    expect(confusionPairs([answer(1, 1), answer(4, 4)])).toEqual([]);
  });
});
