import { describe, it, expect } from 'vitest';
import { blankOut, clozeHosts, BLANK } from './cloze';
import type { Sentence, Word } from '../types';

const W: Record<string, Word> = {
  zou1: { id: 'zou1', hanzi: '租', jyutping: 'zou1', mandarin: '租', audio: '', tones: [1] },
  daan1wai2: { id: 'daan1wai2', hanzi: '單位', jyutping: 'daan1 wai2', mandarin: '单元', audio: '', tones: [1, 2] },
  ghost: { id: 'ghost', hanzi: '冇喺句', jyutping: 'x1', mandarin: 'x', audio: '', tones: [1] },
};
const get = (id: string): Word | undefined => W[id];

const s1: Sentence = {
  id: 'r1', scenarioId: 'rent', speaker: 'A',
  hanzi: '我想租一個單位。', jyutping: 'ngo5 soeng2 zou1 jat1 go3 daan1 wai2',
  mandarin: '我想租一套公寓。', audio: '', vocab: ['zou1', 'daan1wai2'],
};

describe('blankOut', () => {
  it('replaces the first occurrence with a blank', () => {
    expect(blankOut('我想租一個單位。', '單位')).toBe(`我想租一個${BLANK}。`);
  });
  it('returns the original when the word is absent', () => {
    expect(blankOut('我想租一個單位。', '你好')).toBe('我想租一個單位。');
  });
});

describe('clozeHosts', () => {
  it('keeps only vocab words that appear in the sentence', () => {
    const hosts = clozeHosts([s1], get);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].wordIds.sort()).toEqual(['daan1wai2', 'zou1']);
  });

  it('drops sentences whose vocab never appears in the hanzi', () => {
    const s2: Sentence = { ...s1, id: 'x', hanzi: '我想租一個單位。', vocab: ['ghost'] };
    expect(clozeHosts([s2], get)).toHaveLength(0);
  });
});
