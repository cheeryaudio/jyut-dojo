import scenariosJson from '../data/scenarios.json';
import scenarios2Json from '../data/scenarios2.json';
import scenarios3Json from '../data/scenarios3.json';
import sentencesJson from '../data/sentences.json';
import sentences2Json from '../data/sentences2.json';
import sentences3Json from '../data/sentences3.json';
import wordsJson from '../data/words.json';
import words2Json from '../data/words2.json';
import words3Json from '../data/words3.json';
import tonesetsJson from '../data/tonesets.json';
import pinyinJson from '../data/pinyin.json';
import basicsJson from '../data/basics.json';
import basics2Json from '../data/basics2.json';
import type {
  Scenario,
  Sentence,
  Word,
  ToneSet,
  PinyinData,
  PinyinItem,
  BasicsDeck,
} from '../types';

export const scenarios = [
  ...(scenariosJson as unknown as Scenario[]),
  ...(scenarios2Json as unknown as Scenario[]),
  ...(scenarios3Json as unknown as Scenario[]),
];
export const sentences = [
  ...(sentencesJson as unknown as Sentence[]),
  ...(sentences2Json as unknown as Sentence[]),
  ...(sentences3Json as unknown as Sentence[]),
];
export const words = [
  ...(wordsJson as unknown as Word[]),
  ...(words2Json as unknown as Word[]),
  ...(words3Json as unknown as Word[]),
];
export const tonesets = tonesetsJson as unknown as ToneSet[];
export const pinyin = pinyinJson as unknown as PinyinData;
export const basicsDecks = [
  ...(basicsJson as unknown as BasicsDeck[]),
  ...(basics2Json as unknown as BasicsDeck[]),
];

/** Every Word-shaped basics vocab item, flattened across decks. */
export const basicsWords: Word[] = basicsDecks.flatMap((d) => d.words);

const scenarioById = new Map(scenarios.map((s) => [s.id, s]));
const sentenceById = new Map(sentences.map((s) => [s.id, s]));
// Unified word lookup: scenario vocab + basics deck words. Basics words carry
// their own `b_*` ids so review cards created from a deck resolve here too.
const wordById = new Map([...words, ...basicsWords].map((w) => [w.id, w]));

const pinyinDeckById = new Map(basicsDecks.map((d) => [d.id, d]));

export function getScenario(id: string): Scenario | undefined {
  return scenarioById.get(id);
}

export function getSentence(id: string): Sentence | undefined {
  return sentenceById.get(id);
}

export function getWord(id: string): Word | undefined {
  return wordById.get(id);
}

export function getBasicsDeck(id: string): BasicsDeck | undefined {
  return pinyinDeckById.get(id);
}

/** Pinyin items for a lesson ref ('initials' → all initials, else finals flat). */
export function pinyinItems(ref: string): PinyinItem[] {
  if (ref === 'initials') return pinyin.initials;
  return pinyin.finalGroups.flatMap((g) => g.items);
}

export function scenarioSentences(scenarioId: string): Sentence[] {
  const sc = scenarioById.get(scenarioId);
  if (!sc) return [];
  return sc.sentences.map((id) => sentenceById.get(id)).filter((s): s is Sentence => Boolean(s));
}

/** All distinct vocab word ids taught by a scenario. */
export function scenarioVocab(scenarioId: string): string[] {
  const ids = new Set<string>();
  for (const s of scenarioSentences(scenarioId)) for (const v of s.vocab) ids.add(v);
  return [...ids];
}
