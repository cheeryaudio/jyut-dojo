/**
 * Audio grouped by learning-path stage, for offline packs.
 *
 * A pack is "everything you need to hear to finish this stage": dialogue lines,
 * their vocab, the decks, the pinyin lesson items, tone examples, and grammar
 * examples. Packs overlap on purpose — downloading one stage must make that
 * stage usable offline on its own.
 */
import type { Curriculum } from './types';

export interface AudioPack {
  stageId: string;
  title: string;
  subtitle: string;
  /** Unique data paths ("/audio/...") in curriculum order. */
  paths: string[];
}

function pinyinPaths(curriculum: Curriculum, ref: string): string[] {
  if (ref === 'initials') return curriculum.pinyin.initials.map((item) => item.audio);
  return curriculum.pinyin.finalGroups.flatMap((group) => group.items.map((item) => item.audio));
}

function tonePaths(curriculum: Curriculum): string[] {
  return curriculum.tonesets.flatMap((set) => set.items.map((item) => item.audio));
}

function scenarioPaths(curriculum: Curriculum, scenarioId: string): string[] {
  const scenario = curriculum.scenarioById.get(scenarioId);
  if (!scenario) return [];
  const paths: string[] = [];
  for (const sentenceId of scenario.sentences) {
    const sentence = curriculum.sentenceById.get(sentenceId);
    if (!sentence) continue;
    paths.push(sentence.audio);
    for (const wordId of sentence.vocab) {
      const word = curriculum.wordById.get(wordId);
      if (word) paths.push(word.audio);
    }
  }
  return paths;
}

function grammarPaths(curriculum: Curriculum): string[] {
  return curriculum.patterns.flatMap((pattern) => pattern.examples.map((example) => example.audio));
}

/** Build one downloadable pack per path stage. */
export function buildAudioPacks(curriculum: Curriculum): AudioPack[] {
  return curriculum.path.stages.map((stage) => {
    const paths: string[] = [];
    for (const unit of stage.units) {
      switch (unit.type) {
        case 'tones':
        case 'tonedrill':
          paths.push(...tonePaths(curriculum));
          break;
        case 'pinyin':
          paths.push(...pinyinPaths(curriculum, unit.ref));
          break;
        case 'basics':
          paths.push(
            ...(curriculum.basicsDeckById.get(unit.ref)?.words.map((word) => word.audio) ?? [])
          );
          break;
        case 'scenario':
          paths.push(...scenarioPaths(curriculum, unit.ref));
          break;
        case 'grammar':
          paths.push(...grammarPaths(curriculum));
          break;
      }
    }
    return {
      stageId: stage.id,
      title: stage.title,
      subtitle: stage.subtitle,
      paths: [...new Set(paths)],
    };
  });
}
