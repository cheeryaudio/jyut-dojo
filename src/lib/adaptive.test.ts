import { describe, it, expect } from 'vitest';
import {
  initDrillState,
  nextLevel,
  drawTone,
  levelTones,
  MAX_LEVEL,
  STREAK_TO_ADVANCE,
  type DrillState,
} from './adaptive';

describe('levelTones', () => {
  it('maps each level to its tone subset', () => {
    expect(levelTones(1)).toEqual([1, 4]);
    expect(levelTones(3)).toEqual([2, 5]);
    expect(levelTones(6)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('nextLevel — level up', () => {
  it('advances after a 5-correct streak and resets the streak', () => {
    let s = initDrillState();
    for (let i = 0; i < STREAK_TO_ADVANCE - 1; i++) {
      s = nextLevel(s, true);
      expect(s.level).toBe(1);
    }
    expect(s.streak).toBe(STREAK_TO_ADVANCE - 1);
    s = nextLevel(s, true); // 5th correct
    expect(s.level).toBe(2);
    expect(s.streak).toBe(0);
  });

  it('never exceeds the max level', () => {
    let s: DrillState = { level: MAX_LEVEL, streak: 4, reinforce: [] };
    s = nextLevel(s, true);
    expect(s.level).toBe(MAX_LEVEL);
    // streak keeps climbing but level is capped
    expect(s.streak).toBe(5);
  });
});

describe('nextLevel — wrong answers', () => {
  it('resets the streak to 0', () => {
    let s = nextLevel(initDrillState(), true);
    s = nextLevel(s, true);
    expect(s.streak).toBe(2);
    s = nextLevel(s, false, { actual: 3, picked: 6 });
    expect(s.streak).toBe(0);
  });

  it('pushes the confusion pair (normalised) onto the reinforcement queue', () => {
    let s = nextLevel(initDrillState(), false, { actual: 5, picked: 2 });
    expect(s.reinforce).toEqual([[2, 5]]);
    // duplicate confusion is not queued twice
    s = nextLevel(s, false, { actual: 2, picked: 5 });
    expect(s.reinforce).toEqual([[2, 5]]);
    // a genuinely new confusion is prepended
    s = nextLevel(s, false, { actual: 3, picked: 6 });
    expect(s.reinforce).toEqual([[3, 6], [2, 5]]);
  });

  it('does not enqueue when actual equals picked', () => {
    const s = nextLevel(initDrillState(), false, { actual: 4, picked: 4 });
    expect(s.reinforce).toEqual([]);
  });

  it('consumes one reinforcement item on a correct answer', () => {
    let s: DrillState = { level: 2, streak: 0, reinforce: [[2, 5]] };
    s = nextLevel(s, true);
    expect(s.reinforce).toEqual([]);
  });
});

describe('drawTone', () => {
  it('draws from the reinforcement queue first', () => {
    const s: DrillState = { level: 6, streak: 0, reinforce: [[2, 5]] };
    expect(drawTone(s, () => 0)).toBe(2);
    expect(drawTone(s, () => 0.99)).toBe(5);
  });

  it('otherwise draws from the current level subset', () => {
    const s: DrillState = { level: 3, streak: 0, reinforce: [] };
    expect([2, 5]).toContain(drawTone(s, () => 0.1));
  });
});
