import { describe, it, expect } from 'vitest';
import {
  createCard,
  schedule,
  previewIntervals,
  MIN_EASE,
  START_EASE,
  type Grade,
} from './srs';

const T0 = new Date('2026-07-21T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function dueDays(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / DAY);
}

describe('createCard', () => {
  it('starts fresh with default ease 2.5', () => {
    const c = createCard('w1', T0);
    expect(c).toMatchObject({ wordId: 'w1', interval: 0, ease: START_EASE, reps: 0, lapses: 0 });
    expect(c.due).toBe(T0.toISOString());
  });
});

describe('schedule — new card', () => {
  it('Good on a new card → 1 day, reps 1', () => {
    const c = schedule(createCard('w', T0), 'good', T0);
    expect(c.interval).toBe(1);
    expect(c.reps).toBe(1);
    expect(c.ease).toBe(2.5);
    expect(dueDays(c.due, T0)).toBe(1);
  });

  it('Easy on a new card → 4 days, ease bumped', () => {
    const c = schedule(createCard('w', T0), 'easy', T0);
    expect(c.interval).toBe(4);
    expect(c.ease).toBe(2.65);
    expect(c.reps).toBe(1);
  });

  it('Hard on a new card → 1 day, ease down', () => {
    const c = schedule(createCard('w', T0), 'hard', T0);
    expect(c.interval).toBe(1);
    expect(c.ease).toBe(2.35);
  });
});

describe('schedule — Good progression', () => {
  it('follows 1 → 6 → interval*ease', () => {
    let c = createCard('w', T0);
    c = schedule(c, 'good', T0);
    expect(c.interval).toBe(1);
    c = schedule(c, 'good', T0);
    expect(c.interval).toBe(6);
    c = schedule(c, 'good', T0);
    expect(c.interval).toBe(Math.round(6 * 2.5)); // 15
    expect(c.reps).toBe(3);
  });
});

describe('schedule — lapse & ease floor', () => {
  it('Again resets reps, adds a lapse, interval back to 1, ease down', () => {
    let c = createCard('w', T0);
    c = schedule(c, 'good', T0);
    c = schedule(c, 'good', T0); // interval 6, reps 2
    const lapsed = schedule(c, 'again', T0);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBe(2.3);
  });

  it('ease never drops below 1.3', () => {
    let c = createCard('w', T0);
    for (let i = 0; i < 12; i++) c = schedule(c, 'again', T0);
    expect(c.ease).toBe(MIN_EASE);
    expect(c.lapses).toBe(12);
  });
});

describe('previewIntervals', () => {
  it('gives all four grade intervals for a new card', () => {
    const p = previewIntervals(createCard('w', T0), T0);
    const expected: Record<Grade, number> = { again: 1, hard: 1, good: 1, easy: 4 };
    expect(p).toEqual(expected);
  });
});
