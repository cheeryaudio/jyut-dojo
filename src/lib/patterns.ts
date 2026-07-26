import patternsJson from '../data/patterns.json';
import type { Pattern } from '../types';

export const patterns = patternsJson as unknown as Pattern[];

/** Map every sentence id → the pattern(s) it belongs to (first wins for the chip). */
const bySentence = new Map<string, Pattern>();
for (const p of patterns) {
  for (const sid of p.sentenceIds) {
    if (!bySentence.has(sid)) bySentence.set(sid, p);
  }
}

export function getPattern(id: string): Pattern | undefined {
  return patterns.find((p) => p.id === id);
}

/** The pattern a dialogue sentence illustrates, if any (for the 學-mode 句型 chip). */
export function patternForSentence(sentenceId: string): Pattern | undefined {
  return bySentence.get(sentenceId);
}
