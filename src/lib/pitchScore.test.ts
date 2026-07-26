import { describe, it, expect } from 'vitest';
import { dtwScore, normalizeTrack, resample, RESAMPLE_N } from './pitchScore';

/** A rising contour over `n` samples, spanning ±span/2 semitones. */
function ramp(n: number, span: number): number[] {
  return Array.from({ length: n }, (_, i) => -span / 2 + (span * i) / (n - 1));
}

describe('normalizeTrack', () => {
  it('centers on its own median (removes register)', () => {
    const centered = normalizeTrack([10, 12, 14]);
    expect(centered).toEqual([-2, 0, 2]);
  });
  it('drops non-finite frames', () => {
    expect(normalizeTrack([NaN, 5, Infinity, 5])).toEqual([0, 0]);
  });
});

describe('resample', () => {
  it('always returns exactly RESAMPLE_N points', () => {
    expect(resample([0, 1, 2, 3, 4]).length).toBe(RESAMPLE_N);
    expect(resample([7]).length).toBe(RESAMPLE_N);
  });
  it('keeps endpoints', () => {
    const r = resample([0, 10]);
    expect(r[0]).toBeCloseTo(0);
    expect(r[r.length - 1]).toBeCloseTo(10);
  });
});

describe('dtwScore', () => {
  it('identical arrays score 100 (±1)', () => {
    const a = ramp(40, 8);
    expect(dtwScore(a, a)).toBeGreaterThanOrEqual(99);
  });

  it('shifted but same shape scores high', () => {
    const a = ramp(40, 8);
    const shifted = a.map((x) => x + 5); // pure register offset
    expect(dtwScore(a, shifted)).toBeGreaterThan(90);
  });

  it('same shape at a different rate still scores high (DTW)', () => {
    const slow = ramp(60, 8);
    const fast = ramp(20, 8);
    expect(dtwScore(slow, fast)).toBeGreaterThan(85);
  });

  it('flat vs moving contour reads below 50', () => {
    const flat = new Array(40).fill(0);
    const moving = ramp(40, 12);
    expect(dtwScore(flat, moving)).toBeLessThan(50);
  });

  it('inverted contour scores low', () => {
    const rising = ramp(40, 12);
    const falling = [...rising].reverse();
    expect(dtwScore(rising, falling)).toBeLessThan(40);
  });

  it('returns 0 when a track is empty', () => {
    expect(dtwScore([], [1, 2, 3])).toBe(0);
  });
});
