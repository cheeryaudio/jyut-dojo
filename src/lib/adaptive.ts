/**
 * Adaptive tone-discrimination drill.
 *
 * Levels are subsets of the six Cantonese tones, ordered so that the classic
 * Mandarin-speaker confusions are trained in isolation before being mixed:
 *   L1 [1,4]  high-flat vs low-fall (easy anchor)
 *   L2 [1,3,6] the three level tones
 *   L3 [2,5]  rising vs low-rising — the hardest minimal contrast
 *   L4 [3,6]  mid-flat vs low-flat
 *   L5 [2,3,5,6] the four "murky middle" tones together
 *   L6 [1..6] everything
 *
 * A 5-in-a-row streak advances a level (capped at L6). Any wrong answer resets
 * the streak and pushes the confusion pair onto a reinforcement queue that the
 * question generator should draw from first.
 */

export type TonePair = [number, number];

export interface DrillState {
  /** current level, 1..6 */
  level: number;
  /** consecutive correct answers toward the next level-up */
  streak: number;
  /** confusion pairs to re-test first, oldest last */
  reinforce: TonePair[];
}

export const MAX_LEVEL = 6;
export const STREAK_TO_ADVANCE = 5;

const LEVELS: Record<number, number[]> = {
  1: [1, 4],
  2: [1, 3, 6],
  3: [2, 5],
  4: [3, 6],
  5: [2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

export function levelTones(level: number): number[] {
  return LEVELS[level] ?? LEVELS[1];
}

export function initDrillState(): DrillState {
  return { level: 1, streak: 0, reinforce: [] };
}

/** Normalise a confusion pair so [5,2] and [2,5] compare equal. */
function normPair(a: number, b: number): TonePair {
  return a <= b ? [a, b] : [b, a];
}

function samePair(x: TonePair, y: TonePair): boolean {
  return x[0] === y[0] && x[1] === y[1];
}

/**
 * Advance the drill state given whether the last answer was correct.
 * On a wrong answer, pass the `(actual, picked)` tones so the confusion pair
 * is enqueued for reinforcement. Pure: never mutates `state`.
 */
export function nextLevel(
  state: DrillState,
  correct: boolean,
  confusion?: { actual: number; picked: number }
): DrillState {
  if (correct) {
    const streak = state.streak + 1;
    // consume one reinforcement item on success
    const reinforce = state.reinforce.slice(0, Math.max(0, state.reinforce.length - 1));
    if (streak >= STREAK_TO_ADVANCE && state.level < MAX_LEVEL) {
      return { level: state.level + 1, streak: 0, reinforce };
    }
    return { level: state.level, streak, reinforce };
  }

  // wrong answer
  let reinforce = state.reinforce;
  if (confusion && confusion.actual !== confusion.picked) {
    const pair = normPair(confusion.actual, confusion.picked);
    if (!reinforce.some((p) => samePair(p, pair))) {
      reinforce = [pair, ...reinforce];
    }
  }
  return { level: state.level, streak: 0, reinforce };
}

/**
 * Choose the target tone for the next question. Reinforcement pairs are drawn
 * first (a random tone from the oldest queued pair); otherwise a random tone
 * from the current level's subset. `rng` returns [0,1); injectable for tests.
 */
export function drawTone(state: DrillState, rng: () => number = Math.random): number {
  if (state.reinforce.length > 0) {
    const pair = state.reinforce[state.reinforce.length - 1];
    return pair[rng() < 0.5 ? 0 : 1];
  }
  const tones = levelTones(state.level);
  return tones[Math.floor(rng() * tones.length)] ?? tones[0];
}
