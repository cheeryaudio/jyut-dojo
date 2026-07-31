import { describe, expect, it } from 'vitest';
import { buildAudioPacks } from './audioAssets';
import { curriculum } from './registry';

describe('buildAudioPacks', () => {
  const packs = buildAudioPacks(curriculum);

  it('produces one pack per path stage', () => {
    expect(packs.map((pack) => pack.stageId)).toEqual(curriculum.path.stages.map((stage) => stage.id));
  });

  it('gives every stage some audio, with no duplicates inside a pack', () => {
    for (const pack of packs) {
      expect(pack.paths.length).toBeGreaterThan(0);
      expect(new Set(pack.paths).size).toBe(pack.paths.length);
    }
  });

  it('ships a scenario stage with both its dialogue lines and their vocab', () => {
    const scenarioStage = curriculum.path.stages.find((stage) =>
      stage.units.some((unit) => unit.type === 'scenario')
    );
    expect(scenarioStage).toBeDefined();
    const unit = scenarioStage!.units.find((item) => item.type === 'scenario')!;
    const scenario = curriculum.scenarioById.get(unit.ref)!;
    const pack = packs.find((item) => item.stageId === scenarioStage!.id)!;

    const sentence = curriculum.sentenceById.get(scenario.sentences[0])!;
    expect(pack.paths).toContain(sentence.audio);
    for (const wordId of sentence.vocab) {
      expect(pack.paths).toContain(curriculum.wordById.get(wordId)!.audio);
    }
  });

  it('references only real audio paths', () => {
    for (const pack of packs) {
      for (const path of pack.paths) {
        expect(path.startsWith('/audio/')).toBe(true);
        expect(path.endsWith('.mp3')).toBe(true);
      }
    }
  });
});
