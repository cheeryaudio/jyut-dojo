import { describe, expect, it } from 'vitest';

import {
  createAliasResolver,
  pinyinItems,
  resolveScenarioId,
  resolveSentenceId,
  resolveWordId,
} from './registry';

describe('curriculum ID aliases', () => {
  it('resolves current IDs to themselves and unknown IDs to undefined', () => {
    const resolve = createAliasResolver('word', {}, new Set(['current']));
    expect(resolve('current')).toBe('current');
    expect(resolve('missing')).toBeUndefined();
  });

  it('follows a safe alias chain to its canonical ID', () => {
    const resolve = createAliasResolver(
      'word',
      { oldest: 'older', older: 'current' },
      new Set(['current'])
    );
    expect(resolve('oldest')).toBe('current');
    expect(resolve('older')).toBe('current');
  });

  it('rejects alias cycles during registry construction', () => {
    expect(() =>
      createAliasResolver('sentence', { oldA: 'oldB', oldB: 'oldA' }, new Set(['current']))
    ).toThrowError('sentence alias cycle: oldA -> oldB -> oldA');
  });

  it('rejects aliases that never reach a current ID', () => {
    expect(() =>
      createAliasResolver('scenario', { former: 'missing' }, new Set(['current']))
    ).toThrowError('scenario alias "former" ends at unknown ID "missing"');
  });

  it('does not allow an alias to shadow a current ID', () => {
    expect(() =>
      createAliasResolver('word', { current: 'replacement' }, new Set(['current', 'replacement']))
    ).toThrowError('word alias "current" conflicts with a current ID');
  });

  it('exposes public resolvers for all persisted curriculum ID kinds', () => {
    expect(resolveWordId('nei5hou2')).toBe('nei5hou2');
    expect(resolveSentenceId('g1')).toBe('g1');
    expect(resolveScenarioId('greet')).toBe('greet');
    expect(resolveWordId('not-a-word')).toBeUndefined();
  });
});

describe('pinyin lesson references', () => {
  it('distinguishes initials and finals and rejects unknown references', () => {
    expect(pinyinItems('initials')).toHaveLength(19);
    expect(pinyinItems('finals')).toHaveLength(53);
    expect(() => pinyinItems('anything-else')).toThrowError(
      'Unknown pinyin lesson ref "anything-else"; expected "initials" or "finals"'
    );
  });
});
