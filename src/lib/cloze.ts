/**
 * 填空 (cloze) question builder for the scenario quiz.
 *
 * A cloze shows a sentence with one of its vocab words blanked to ＿＿; the
 * learner picks the missing word from 4 choices (the correct word + 3 distractor
 * words drawn from the same scenario). Kept pure so it can be unit-tested and
 * reused by the wrongbook redo flow.
 */
import type { Sentence, Word } from '../types';

export const BLANK = '＿＿';

export interface ClozeQuestion {
  sentence: Sentence;
  /** the hidden word */
  word: Word;
  /** sentence.hanzi with the hidden word replaced by ＿＿ */
  blanked: string;
  /** 4 choices, correct word included, order preserved by caller */
  options: Word[];
}

/** Replace the first occurrence of `wordHanzi` in `hanzi` with a blank. */
export function blankOut(hanzi: string, wordHanzi: string): string {
  const idx = hanzi.indexOf(wordHanzi);
  if (idx < 0) return hanzi;
  return hanzi.slice(0, idx) + BLANK + hanzi.slice(idx + wordHanzi.length);
}

/**
 * Sentences that can host a cloze: they must have at least one vocab word whose
 * hanzi actually appears in the sentence so the blank lands on real text.
 * Returns each usable (sentence, hostable word ids) pair.
 */
export function clozeHosts(
  sentences: Sentence[],
  getWord: (id: string) => Word | undefined
): { sentence: Sentence; wordIds: string[] }[] {
  const out: { sentence: Sentence; wordIds: string[] }[] = [];
  for (const s of sentences) {
    const wordIds = s.vocab.filter((id) => {
      const w = getWord(id);
      return Boolean(w && s.hanzi.includes(w.hanzi));
    });
    if (wordIds.length > 0) out.push({ sentence: s, wordIds });
  }
  return out;
}
