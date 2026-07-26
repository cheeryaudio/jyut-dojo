export interface AlignedChar {
  /** the CJK (Han) character */
  hanzi: string;
  /** its jyutping syllable, e.g. "nei5" */
  syllable: string;
  /** index within the original hanzi string */
  charIndex: number;
}

const HAN = /\p{Script=Han}/u;

/** Filter a string down to its Han (CJK) characters, dropping punctuation etc. */
export function hanChars(hanzi: string): string[] {
  return [...hanzi].filter((c) => HAN.test(c));
}

/**
 * Zip the Han characters of `hanzi` 1:1 with the space-separated jyutping
 * syllables. Content is validated so counts always match; if they somehow do
 * not, we align as far as the shorter of the two to stay crash-free.
 */
export function alignHanziJyutping(hanzi: string, jyutping: string): AlignedChar[] {
  const syls = jyutping.trim().split(/\s+/).filter(Boolean);
  const out: AlignedChar[] = [];
  let syl = 0;
  const chars = [...hanzi];
  for (let i = 0; i < chars.length && syl < syls.length; i++) {
    const c = chars[i];
    if (!HAN.test(c)) continue;
    out.push({ hanzi: c, syllable: syls[syl], charIndex: i });
    syl++;
  }
  return out;
}
