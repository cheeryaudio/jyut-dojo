/**
 * Tone drill statistics shown on 進度.
 *
 * Pure functions over the persisted tone answer log so the page renders numbers
 * it does not compute, and the accuracy maths can be tested directly.
 */
import type { ToneAnswer } from '../progress/model';

export interface ToneAccuracy {
  tone: number;
  total: number;
  correct: number;
  /** 0-100, rounded; 0 when the learner has not answered this tone yet. */
  percent: number;
}

export interface TonePair {
  key: string;
  a: number;
  b: number;
  total: number;
  correct: number;
  percent: number;
}

function percentOf(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/** Stable key for an unordered tone pair, e.g. (5,2) and (2,5) both give "2v5". */
export function tonePairKey(a: number, b: number): string {
  return a <= b ? `${a}v${b}` : `${b}v${a}`;
}

/** Per-tone accuracy for every tone in `tones`, in the order given. */
export function toneAccuracy(answers: readonly ToneAnswer[], tones: readonly number[]): ToneAccuracy[] {
  const totals = new Map<number, { total: number; correct: number }>();
  for (const tone of tones) totals.set(tone, { total: 0, correct: 0 });

  for (const answer of answers) {
    const bucket = totals.get(answer.actual);
    if (!bucket) continue;
    bucket.total += 1;
    if (answer.picked === answer.actual) bucket.correct += 1;
  }

  return tones.map((tone) => {
    const bucket = totals.get(tone) ?? { total: 0, correct: 0 };
    return {
      tone,
      total: bucket.total,
      correct: bucket.correct,
      percent: percentOf(bucket.correct, bucket.total),
    };
  });
}

/**
 * Tone pairs the learner has actually confused, worst accuracy first.
 * A pair only appears once it caused at least one wrong answer; its accuracy
 * then counts every answer that stayed inside the pair.
 */
export function confusionPairs(answers: readonly ToneAnswer[]): TonePair[] {
  const confused = new Set<string>();
  for (const answer of answers) {
    if (answer.picked !== answer.actual) confused.add(tonePairKey(answer.actual, answer.picked));
  }

  const rows: TonePair[] = [];
  for (const key of confused) {
    const [a, b] = key.split('v').map(Number);
    const pair = new Set([a, b]);
    let total = 0;
    let correct = 0;
    for (const answer of answers) {
      if (!pair.has(answer.actual) || !pair.has(answer.picked)) continue;
      total += 1;
      if (answer.picked === answer.actual) correct += 1;
    }
    if (total > 0) rows.push({ key, a, b, total, correct, percent: percentOf(correct, total) });
  }

  // Worst first; ties broken by the larger sample so the advice is trustworthy.
  return rows.sort((x, y) => x.correct / x.total - y.correct / y.total || y.total - x.total);
}
