import { describe, it, expect } from 'vitest';
import {
  addXp,
  dayXp,
  totalXp,
  goalXp,
  weekStart,
  weekStrip,
  heatmap,
} from './xp';
import { dayKey } from './dates';

describe('addXp / dayXp / totalXp', () => {
  it('accumulates into the right day bucket', () => {
    let log: Record<string, number> = {};
    log = addXp(log, 20, '2026-07-21');
    log = addXp(log, 5, '2026-07-21');
    log = addXp(log, 15, '2026-07-20');
    expect(dayXp(log, '2026-07-21')).toBe(25);
    expect(dayXp(log, '2026-07-20')).toBe(15);
    expect(totalXp(log)).toBe(40);
  });
  it('is a no-op for zero and does not mutate', () => {
    const log = { '2026-07-21': 10 };
    expect(addXp(log, 0)).toBe(log);
    const next = addXp(log, 5, '2026-07-21');
    expect(log['2026-07-21']).toBe(10);
    expect(next['2026-07-21']).toBe(15);
  });
});

describe('goalXp', () => {
  it('is minutes × 10', () => {
    expect(goalXp(5)).toBe(50);
    expect(goalXp(20)).toBe(200);
  });
});

describe('weekStart', () => {
  it('returns Monday for a mid-week date', () => {
    // 2026-07-21 is a Tuesday → Monday is 2026-07-20
    const mon = weekStart(new Date(2026, 6, 21, 15, 0));
    expect(dayKey(mon)).toBe('2026-07-20');
  });
  it('returns the same day for a Monday', () => {
    const mon = weekStart(new Date(2026, 6, 20, 9));
    expect(dayKey(mon)).toBe('2026-07-20');
  });
});

describe('weekStrip', () => {
  const now = new Date(2026, 6, 21, 12); // Tuesday
  it('marks full/half/empty against the goal', () => {
    const goal = 50;
    const xpLog = { '2026-07-20': 60, '2026-07-21': 20 };
    const activityLog = { '2026-07-22': 1 };
    const strip = weekStrip(xpLog, activityLog, goal, now);
    expect(strip).toHaveLength(7);
    expect(strip[0].state).toBe('full'); // Mon 60 ≥ 50
    expect(strip[1].state).toBe('half'); // Tue 20 < 50 but > 0
    expect(strip[2].state).toBe('half'); // Wed activity only
    expect(strip[3].state).toBe('empty');
    expect(strip[0].weekday).toBe(0);
    expect(strip[6].weekday).toBe(6);
  });
});

describe('heatmap', () => {
  const now = new Date(2026, 6, 21, 12);
  it('returns N days oldest→newest with intensity buckets', () => {
    const xpLog = { '2026-07-21': 120, '2026-07-20': 30, '2026-07-19': 5 };
    const activityLog = { '2026-07-18': 2 };
    const days = heatmap(xpLog, activityLog, 30, now);
    expect(days).toHaveLength(30);
    expect(days[days.length - 1].key).toBe('2026-07-21');
    expect(days[days.length - 1].level).toBe(4); // 120 xp
    expect(days[days.length - 2].level).toBe(2); // 30 xp
    expect(days[days.length - 3].level).toBe(1); // 5 xp
    expect(days[days.length - 4].level).toBe(1); // activity only
    expect(days[0].level).toBe(0);
  });
});
