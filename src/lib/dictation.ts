/**
 * Dictation grading (聽寫).
 *
 * The learner hears a sentence and rebuilds it from jyutping syllable chips.
 * Grading is lenient: an exact syllable sequence is a clean pass, but if the
 * only mistakes are tone digits (right sounds, wrong tones) we still accept it
 * on the first miss so a single tone slip doesn't feel punishing — the caller
 * can surface a gentle "音啱、聲調要留意" note for the toneless case.
 */

export type DictationResult = 'exact' | 'toneless' | 'wrong';

/** Strip the trailing tone digit from a jyutping syllable ("hou2" → "hou"). */
function stripTone(syllable: string): string {
  return syllable.replace(/[1-6]$/, '');
}

/** Normalise a jyutping string into lowercase syllable tokens. */
export function toSyllables(jyutping: string): string[] {
  return jyutping.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Grade an assembled answer against the target syllable sequence.
 * - 'exact'    → identical syllables (tones included)
 * - 'toneless' → identical once tones are ignored (lenient pass)
 * - 'wrong'    → wrong length or wrong base syllables
 */
export function gradeDictation(answer: string[], target: string[]): DictationResult {
  if (answer.length !== target.length) return 'wrong';
  const exact = answer.every((a, i) => a === target[i]);
  if (exact) return 'exact';
  const toneless = answer.every((a, i) => stripTone(a) === stripTone(target[i]));
  return toneless ? 'toneless' : 'wrong';
}

/** Whether a result counts as correct for scoring (lenient). */
export function isPass(result: DictationResult): boolean {
  return result !== 'wrong';
}
