import type { ReviewCard } from '../types';

/**
 * Spaced-repetition scheduler.
 *
 * Deliberate design note — this is an *SM-2 / FSRS-lite* tradeoff:
 * we keep SM-2's per-card `ease` factor and interval growth (cheap, well
 * understood, no training data required) but drop FSRS's full stability /
 * difficulty model. That means slightly less optimal spacing than modern
 * FSRS, in exchange for a tiny, fully deterministic, unit-testable core with
 * zero parameters to fit. Good enough for a few hundred vocabulary cards.
 *
 * Constants:
 *  - start ease 2.5, hard floor 1.3
 *  - new-card Good interval = 1 day, Easy = 4 days
 *  - second Good interval = 6 days, thereafter interval * ease
 *  - Again = a lapse: reps reset to 0, interval back to 1 day, ease penalised
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** Labels shown on the four review buttons. */
export const GRADE_LABELS: Record<Grade, string> = {
  again: '不会',
  hard: '有点难',
  good: '会',
  easy: '很简单',
};

export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const EASY_BONUS = 1.3;
export const HARD_MULTIPLIER = 1.2;
export const SECOND_INTERVAL = 6;
export const EASY_NEW_INTERVAL = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

export function createCard(wordId: string, now: Date = new Date()): ReviewCard {
  return {
    wordId,
    due: now.toISOString(),
    interval: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0,
    updatedAt: now.getTime(),
  };
}

function clampEase(e: number): number {
  return Math.max(MIN_EASE, Math.round(e * 100) / 100);
}

/**
 * Apply a grade to a card and return the updated card. Pure — never mutates
 * the input.
 */
export function schedule(card: ReviewCard, grade: Grade, now: Date = new Date()): ReviewCard {
  let { ease, reps, lapses, interval } = card;

  switch (grade) {
    case 'again': {
      ease = clampEase(ease - 0.2);
      lapses += 1;
      reps = 0;
      interval = 1;
      break;
    }
    case 'hard': {
      ease = clampEase(ease - 0.15);
      interval = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * HARD_MULTIPLIER));
      reps += 1;
      break;
    }
    case 'good': {
      // ease unchanged
      if (reps === 0) interval = 1;
      else if (reps === 1) interval = SECOND_INTERVAL;
      else interval = Math.round(interval * ease);
      reps += 1;
      break;
    }
    case 'easy': {
      ease = clampEase(ease + 0.15);
      if (reps === 0) interval = EASY_NEW_INTERVAL;
      else interval = Math.max(interval + 1, Math.round(interval * ease * EASY_BONUS));
      reps += 1;
      break;
    }
  }

  const due = new Date(now.getTime() + interval * DAY_MS).toISOString();
  return { wordId: card.wordId, due, interval, ease, reps, lapses, updatedAt: now.getTime() };
}

/** Preview the resulting interval (in days) for each grade. */
export function previewIntervals(card: ReviewCard, now: Date = new Date()): Record<Grade, number> {
  return {
    again: schedule(card, 'again', now).interval,
    hard: schedule(card, 'hard', now).interval,
    good: schedule(card, 'good', now).interval,
    easy: schedule(card, 'easy', now).interval,
  };
}

/** Human-friendly interval, e.g. "1天", "6天", "3周". */
export function formatInterval(days: number): string {
  if (days <= 0) return '今天';
  if (days < 7) return `${days}天`;
  if (days < 30) return `${Math.round(days / 7)}周`;
  if (days < 365) return `${Math.round(days / 30)}个月`;
  return `${Math.round(days / 365)}年`;
}

/** Is this card due at `now`? */
export function isDue(card: ReviewCard, now: Date = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}
