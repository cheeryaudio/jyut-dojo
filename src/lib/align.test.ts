import { describe, it, expect } from 'vitest';
import { hanChars, alignHanziJyutping } from './align';
import sentencesJson from '../data/sentences.json';
import type { Sentence } from '../types';

const sentences = sentencesJson as unknown as Sentence[];

describe('hanChars', () => {
  it('keeps only Han characters, dropping punctuation', () => {
    expect(hanChars('我叫阿明，你叫咩名呀？')).toEqual([
      '我', '叫', '阿', '明', '你', '叫', '咩', '名', '呀',
    ]);
  });

  it('ignores latin, digits and whitespace', () => {
    expect(hanChars('OK 好 123 喇!')).toEqual(['好', '喇']);
  });
});

describe('alignHanziJyutping', () => {
  it('zips Han chars 1:1 with jyutping syllables, skipping punctuation', () => {
    const aligned = alignHanziJyutping('我叫阿明，你叫咩名呀？', 'ngo5 giu3 aa3 ming4 nei5 giu3 me1 meng2 aa3');
    expect(aligned).toHaveLength(9);
    expect(aligned[0]).toEqual({ hanzi: '我', syllable: 'ngo5', charIndex: 0 });
    // 你 comes after the comma, so its charIndex jumps past the punctuation
    expect(aligned[4]).toEqual({ hanzi: '你', syllable: 'nei5', charIndex: 5 });
    expect(aligned[8]).toEqual({ hanzi: '呀', syllable: 'aa3', charIndex: 9 });
  });

  it('aligns every real sentence in the dataset with equal counts', () => {
    for (const s of sentences) {
      const aligned = alignHanziJyutping(s.hanzi, s.jyutping);
      expect(aligned).toHaveLength(hanChars(s.hanzi).length);
      expect(aligned).toHaveLength(s.jyutping.trim().split(/\s+/).length);
    }
  });
});
