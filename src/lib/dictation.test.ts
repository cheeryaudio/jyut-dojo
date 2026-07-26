import { describe, it, expect } from 'vitest';
import { gradeDictation, toSyllables, isPass } from './dictation';

describe('toSyllables', () => {
  it('splits + lowercases + trims', () => {
    expect(toSyllables('  Nei5   Hou2 ')).toEqual(['nei5', 'hou2']);
  });
  it('empty string → empty list', () => {
    expect(toSyllables('   ')).toEqual([]);
  });
});

describe('gradeDictation', () => {
  const target = ['m4', 'goi1', 'bei2', 'ngo5'];

  it('exact match', () => {
    expect(gradeDictation(['m4', 'goi1', 'bei2', 'ngo5'], target)).toBe('exact');
  });

  it('wrong length is wrong', () => {
    expect(gradeDictation(['m4', 'goi1', 'bei2'], target)).toBe('wrong');
  });

  it('right sounds, wrong tones → toneless (lenient pass)', () => {
    expect(gradeDictation(['m1', 'goi3', 'bei4', 'ngo1'], target)).toBe('toneless');
  });

  it('one wrong base syllable → wrong', () => {
    expect(gradeDictation(['m4', 'goi1', 'bei2', 'keoi5'], target)).toBe('wrong');
  });

  it('order matters', () => {
    expect(gradeDictation(['goi1', 'm4', 'bei2', 'ngo5'], target)).toBe('wrong');
  });

  it('isPass accepts exact + toneless, rejects wrong', () => {
    expect(isPass('exact')).toBe(true);
    expect(isPass('toneless')).toBe(true);
    expect(isPass('wrong')).toBe(false);
  });
});
