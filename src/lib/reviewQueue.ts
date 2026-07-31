import type { ReviewCard } from '../types';
import { isDue } from './srs';

export type ReviewWordResolver = (wordId: string) => unknown;

function isResolvable(
  recordId: string,
  card: ReviewCard,
  resolveWord: ReviewWordResolver,
): boolean {
  return recordId === card.wordId && Boolean(resolveWord(card.wordId));
}

/** Build the due-card queue while dropping stale or malformed persisted cards. */
export function buildReviewQueue(
  cards: Record<string, ReviewCard>,
  resolveWord: ReviewWordResolver,
  now: Date = new Date(),
): string[] {
  return Object.entries(cards)
    .filter(([recordId, card]) => isResolvable(recordId, card, resolveWord) && isDue(card, now))
    .sort(([, a], [, b]) => a.due.localeCompare(b.due))
    .map(([recordId]) => recordId);
}

/** Count cards that still resolve to current learning content, due or not. */
export function countResolvableReviewCards(
  cards: Record<string, ReviewCard>,
  resolveWord: ReviewWordResolver,
): number {
  return Object.entries(cards).filter(([recordId, card]) =>
    isResolvable(recordId, card, resolveWord)
  ).length;
}
