import { describe, expect, it } from 'vitest';

import {
  CurriculumSchemaError,
  parseCurriculumManifest,
  parsePathSource,
  parseWordsSource,
} from './schema';

const validManifest = {
  schemaVersion: 1,
  contentVersion: '2026.07.30',
  sourceFiles: {
    words: ['words.json'],
    sentences: ['sentences.json'],
    scenarios: ['scenarios.json'],
    basics: ['basics.json'],
    tones: ['tonesets.json'],
    pinyin: ['pinyin.json'],
    path: ['path.json'],
    patterns: ['patterns.json'],
  },
  supported: {
    locales: { content: 'zh-HK', translations: ['zh-CN'] },
    romanizations: ['jyutping'],
  },
  idPolicy: { aliases: 'old to new', deprecation: 'retain aliases' },
  aliases: { words: {}, sentences: {}, scenarios: {} },
};

describe('curriculum runtime schema', () => {
  it('reports the exact nested path for an invalid tone', () => {
    expect(() =>
      parseWordsSource(
        [
          {
            id: 'word',
            hanzi: '字',
            jyutping: 'zi6',
            mandarin: '字',
            audio: '/audio/words/word.mp3',
            tones: [7],
          },
        ],
        'test/words.json'
      )
    ).toThrowError('test/words.json[0].tones[0]: expected a tone from 1 to 6, got 7');
  });

  it('reports required fields with their source path', () => {
    expect(() => parseWordsSource([{ id: 'word' }], 'test/words.json')).toThrowError(
      'test/words.json[0].hanzi: is required'
    );
  });

  it('rejects unknown path unit types before registry normalization', () => {
    expect(() =>
      parsePathSource(
        {
          stages: [
            {
              id: 'stage',
              title: 'Stage',
              subtitle: 'Subtitle',
              units: [{ type: 'mystery', ref: 'x', title: 'X', emoji: 'X' }],
            },
          ],
        },
        'test/path.json'
      )
    ).toThrowError(
      'test/path.json.stages[0].units[0].type: expected one of tones, pinyin, tonedrill, basics, scenario, grammar, got "mystery"'
    );
  });

  it('rejects malformed content release versions', () => {
    expect(() => parseCurriculumManifest({ ...validManifest, contentVersion: 'latest' })).toThrowError(
      'src/data/curriculum.json.contentVersion: expected YYYY.MM.DD with an optional release suffix'
    );
  });

  it('uses the dedicated schema error type', () => {
    expect(() => parseWordsSource('not-an-array', 'test/words.json')).toThrow(CurriculumSchemaError);
  });
});
