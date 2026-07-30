import { describe, expect, it } from 'vitest';
import type { ReviewCard } from '../types';
import { buildReviewQueue, countResolvableReviewCards } from './reviewQueue';

function card(wordId: string, due: string): ReviewCard {
  return { wordId, due, interval: 1, ease: 2.5, reps: 1, lapses: 0, updatedAt: Date.parse(due) };
}

const now = new Date('2026-07-29T12:00:00.000Z');
const resolveWord = (id: string) => (id.startsWith('valid') ? { id } : undefined);

describe('review queue', () => {
  it('sorts due cards and skips future, orphaned, and mismatched cards', () => {
    const cards = {
      validLater: card('validLater', '2026-07-29T11:00:00.000Z'),
      validFirst: card('validFirst', '2026-07-28T11:00:00.000Z'),
      orphan: card('orphan', '2026-07-27T11:00:00.000Z'),
      wrongKey: card('validMismatch', '2026-07-26T11:00:00.000Z'),
      validFuture: card('validFuture', '2026-07-30T11:00:00.000Z'),
    };

    expect(buildReviewQueue(cards, resolveWord, now)).toEqual(['validFirst', 'validLater']);
  });

  it('counts only cards that still resolve to current content', () => {
    const cards = {
      validOne: card('validOne', '2026-07-29T11:00:00.000Z'),
      validFuture: card('validFuture', '2026-07-30T11:00:00.000Z'),
      orphan: card('orphan', '2026-07-27T11:00:00.000Z'),
    };

    expect(countResolvableReviewCards(cards, resolveWord)).toBe(2);
  });
});
