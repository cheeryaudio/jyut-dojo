import basicsJson from '../../data/basics.json';
import basics2Json from '../../data/basics2.json';
import curriculumJson from '../../data/curriculum.json';
import pathJson from '../../data/path.json';
import patternsJson from '../../data/patterns.json';
import pinyinJson from '../../data/pinyin.json';
import scenariosJson from '../../data/scenarios.json';
import scenarios2Json from '../../data/scenarios2.json';
import scenarios3Json from '../../data/scenarios3.json';
import sentencesJson from '../../data/sentences.json';
import sentences2Json from '../../data/sentences2.json';
import sentences3Json from '../../data/sentences3.json';
import tonesetsJson from '../../data/tonesets.json';
import wordsJson from '../../data/words.json';
import words2Json from '../../data/words2.json';
import words3Json from '../../data/words3.json';

import {
  parseBasicsSource,
  parseCurriculumManifest,
  parsePathSource,
  parsePatternsSource,
  parsePinyinSource,
  parseScenariosSource,
  parseSentencesSource,
  parseToneSetsSource,
  parseWordsSource,
} from './schema';
import type {
  BasicsDeck,
  Curriculum,
  CurriculumJsonSource,
  CurriculumSourceBundle,
  CurriculumSourceFiles,
  PathData,
  Pattern,
  PinyinData,
  PinyinItem,
  Scenario,
  Sentence,
  Word,
} from './types';

const SUPPORTED_SCHEMA_VERSION = 1;
const GRAMMAR_REF = 'grammar';

function source(file: string, data: unknown): CurriculumJsonSource {
  return { file, data };
}

/** The exact files statically imported into the application bundle. */
export const curriculumSourceBundle: CurriculumSourceBundle = {
  manifest: source('curriculum.json', curriculumJson),
  words: [source('words.json', wordsJson), source('words2.json', words2Json), source('words3.json', words3Json)],
  sentences: [
    source('sentences.json', sentencesJson),
    source('sentences2.json', sentences2Json),
    source('sentences3.json', sentences3Json),
  ],
  scenarios: [
    source('scenarios.json', scenariosJson),
    source('scenarios2.json', scenarios2Json),
    source('scenarios3.json', scenarios3Json),
  ],
  basics: [source('basics.json', basicsJson), source('basics2.json', basics2Json)],
  tones: [source('tonesets.json', tonesetsJson)],
  pinyin: [source('pinyin.json', pinyinJson)],
  path: [source('path.json', pathJson)],
  patterns: [source('patterns.json', patternsJson)],
};

function dataPath(file: string): string {
  return file.startsWith('src/') ? file : `src/data/${file}`;
}

function parseMany<T>(
  sources: CurriculumJsonSource[],
  parser: (data: unknown, path: string) => T[]
): T[] {
  return sources.flatMap((entry) => parser(entry.data, dataPath(entry.file)));
}

function parseSingle<T>(
  sources: CurriculumJsonSource[],
  group: string,
  parser: (data: unknown, path: string) => T
): T {
  if (sources.length !== 1) {
    throw new Error(`curriculum.sourceFiles.${group}: expected exactly one source, got ${sources.length}`);
  }
  const entry = sources[0];
  return parser(entry.data, dataPath(entry.file));
}

function importedSourceFiles(bundle: CurriculumSourceBundle): CurriculumSourceFiles {
  return {
    words: bundle.words.map((entry) => entry.file),
    sentences: bundle.sentences.map((entry) => entry.file),
    scenarios: bundle.scenarios.map((entry) => entry.file),
    basics: bundle.basics.map((entry) => entry.file),
    tones: bundle.tones.map((entry) => entry.file),
    pinyin: bundle.pinyin.map((entry) => entry.file),
    path: bundle.path.map((entry) => entry.file),
    patterns: bundle.patterns.map((entry) => entry.file),
  };
}

function assertSourceFilesMatch(
  declared: CurriculumSourceFiles,
  imported: CurriculumSourceFiles
): void {
  for (const group of Object.keys(imported) as Array<keyof CurriculumSourceFiles>) {
    const declaredFiles = declared[group];
    const importedFiles = imported[group];
    if (new Set(declaredFiles).size !== declaredFiles.length) {
      throw new Error(`curriculum.sourceFiles.${group}: contains duplicate file names`);
    }
    if (
      declaredFiles.length !== importedFiles.length ||
      declaredFiles.some((file, index) => file !== importedFiles[index])
    ) {
      throw new Error(
        `curriculum.sourceFiles.${group}: manifest declares [${declaredFiles.join(', ')}], ` +
          `but runtime imports [${importedFiles.join(', ')}]`
      );
    }
  }
}

function uniqueMap<T>(items: T[], label: string, idOf: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = idOf(item);
    if (map.has(id)) throw new Error(`${label}: duplicate ID "${id}"`);
    map.set(id, item);
  }
  return map;
}

export type IdResolver = (id: string) => string | undefined;

/**
 * Build an alias resolver and validate every declared alias immediately.
 * Canonical IDs resolve to themselves; unknown IDs resolve to undefined.
 */
export function createAliasResolver(
  label: string,
  aliases: Readonly<Record<string, string>>,
  canonicalIds: ReadonlySet<string>
): IdResolver {
  const resolve = (id: string): string | undefined => {
    let current = id;
    const chain: string[] = [];
    const seen = new Set<string>();

    while (!canonicalIds.has(current)) {
      if (seen.has(current)) {
        throw new Error(`${label} alias cycle: ${[...chain, current].join(' -> ')}`);
      }
      seen.add(current);
      chain.push(current);
      const next = aliases[current];
      if (next === undefined) return undefined;
      current = next;
    }
    return current;
  };

  for (const alias of Object.keys(aliases)) {
    if (canonicalIds.has(alias)) {
      throw new Error(`${label} alias "${alias}" conflicts with a current ID`);
    }
    const resolved = resolve(alias);
    if (resolved === undefined) {
      throw new Error(`${label} alias "${alias}" ends at unknown ID "${aliases[alias]}"`);
    }
  }

  return resolve;
}

function requiredResolution(resolve: IdResolver, id: string, path: string): string {
  const resolved = resolve(id);
  if (resolved === undefined) throw new Error(`${path}: unknown ID "${id}"`);
  return resolved;
}

function validatePinyin(pinyin: PinyinData): void {
  uniqueMap(pinyin.initials, 'pinyin.initials', (item) => item.jp);
  uniqueMap(pinyin.finalGroups, 'pinyin.finalGroups', (group) => group.id);
  uniqueMap(
    pinyin.finalGroups.flatMap((group) => group.items),
    'pinyin.finals',
    (item) => item.jp
  );
}

function normalizePath(
  path: PathData,
  basicsDeckIds: ReadonlySet<string>,
  resolveScenario: IdResolver,
  patternCount: number
): PathData {
  uniqueMap(path.stages, 'path.stages', (stage) => stage.id);
  const seenUnits = new Set<string>();

  return {
    stages: path.stages.map((stage, stageIndex) => ({
      ...stage,
      units: stage.units.map((unit, unitIndex) => {
        const location = `path.stages[${stageIndex}].units[${unitIndex}]`;
        let ref = unit.ref;
        switch (unit.type) {
          case 'tones':
            if (ref !== 'intro') throw new Error(`${location}.ref: unknown tones ref "${ref}"`);
            break;
          case 'pinyin':
            if (ref !== 'initials' && ref !== 'finals') {
              throw new Error(`${location}.ref: unknown pinyin ref "${ref}"`);
            }
            break;
          case 'tonedrill':
            if (ref !== 'drill') throw new Error(`${location}.ref: unknown tone drill ref "${ref}"`);
            break;
          case 'basics':
            if (!basicsDeckIds.has(ref)) throw new Error(`${location}.ref: unknown basics deck "${ref}"`);
            break;
          case 'scenario':
            ref = requiredResolution(resolveScenario, ref, `${location}.ref`);
            break;
          case 'grammar':
            if (ref !== GRAMMAR_REF || patternCount === 0) {
              throw new Error(`${location}.ref: unknown grammar ref "${ref}"`);
            }
            break;
        }
        const key = `${unit.type}:${ref}`;
        if (seenUnits.has(key)) throw new Error(`${location}: duplicate path unit "${key}"`);
        seenUnits.add(key);
        return { ...unit, ref };
      }),
    })),
  };
}

/** Parse, cross-check, and normalize all curriculum sources. */
export function buildCurriculum(bundle: CurriculumSourceBundle): Curriculum {
  const manifest = parseCurriculumManifest(bundle.manifest.data, dataPath(bundle.manifest.file));
  if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `curriculum.schemaVersion: runtime supports ${SUPPORTED_SCHEMA_VERSION}, got ${manifest.schemaVersion}`
    );
  }
  assertSourceFilesMatch(manifest.sourceFiles, importedSourceFiles(bundle));

  const parsedWords = parseMany(bundle.words, parseWordsSource);
  const parsedSentences = parseMany(bundle.sentences, parseSentencesSource);
  const parsedScenarios = parseMany(bundle.scenarios, parseScenariosSource);
  const basicsDecks = parseMany(bundle.basics, parseBasicsSource);
  const tonesets = parseMany(bundle.tones, parseToneSetsSource);
  const pinyin = parseSingle(bundle.pinyin, 'pinyin', parsePinyinSource);
  const parsedPath = parseSingle(bundle.path, 'path', parsePathSource);
  const parsedPatterns = parseMany(bundle.patterns, parsePatternsSource);

  const basicsWords = basicsDecks.flatMap((deck) => deck.words);
  const allWords = [...parsedWords, ...basicsWords];
  const currentWordMap = uniqueMap(allWords, 'curriculum.words', (word) => word.id);
  const currentSentenceMap = uniqueMap(parsedSentences, 'curriculum.sentences', (sentence) => sentence.id);
  const currentScenarioMap = uniqueMap(parsedScenarios, 'curriculum.scenarios', (scenario) => scenario.id);
  const basicsDeckById = uniqueMap(basicsDecks, 'curriculum.basics', (deck) => deck.id);
  uniqueMap(tonesets, 'curriculum.tonesets', (set) => set.syllable);
  uniqueMap(parsedPatterns, 'curriculum.patterns', (pattern) => pattern.id);
  validatePinyin(pinyin);

  const resolveWord = createAliasResolver('word', manifest.aliases.words, new Set(currentWordMap.keys()));
  const resolveSentence = createAliasResolver(
    'sentence',
    manifest.aliases.sentences,
    new Set(currentSentenceMap.keys())
  );
  const resolveScenario = createAliasResolver(
    'scenario',
    manifest.aliases.scenarios,
    new Set(currentScenarioMap.keys())
  );

  const sentences: Sentence[] = parsedSentences.map((sentence) => ({
    ...sentence,
    scenarioId: requiredResolution(
      resolveScenario,
      sentence.scenarioId,
      `sentence ${sentence.id}.scenarioId`
    ),
    vocab: sentence.vocab.map((id, index) =>
      requiredResolution(resolveWord, id, `sentence ${sentence.id}.vocab[${index}]`)
    ),
  }));
  const sentenceById = uniqueMap(sentences, 'curriculum.sentences', (sentence) => sentence.id);

  const scenarios: Scenario[] = parsedScenarios.map((scenario) => ({
    ...scenario,
    sentences: scenario.sentences.map((id, index) =>
      requiredResolution(resolveSentence, id, `scenario ${scenario.id}.sentences[${index}]`)
    ),
  }));
  const scenarioById = uniqueMap(scenarios, 'curriculum.scenarios', (scenario) => scenario.id);

  const containingScenario = new Map<string, string>();
  for (const scenario of scenarios) {
    for (const sentenceId of scenario.sentences) {
      const previous = containingScenario.get(sentenceId);
      if (previous !== undefined) {
        throw new Error(
          `scenario ${scenario.id}.sentences: sentence "${sentenceId}" is already contained by scenario "${previous}"`
        );
      }
      containingScenario.set(sentenceId, scenario.id);
      const sentence = sentenceById.get(sentenceId);
      if (sentence === undefined) throw new Error(`scenario ${scenario.id}: missing sentence "${sentenceId}"`);
      if (sentence.scenarioId !== scenario.id) {
        throw new Error(
          `sentence ${sentence.id}.scenarioId: expected "${scenario.id}" from containing scenario, got "${sentence.scenarioId}"`
        );
      }
    }
  }
  for (const sentence of sentences) {
    if (!containingScenario.has(sentence.id)) {
      throw new Error(`sentence ${sentence.id}: not contained by scenario "${sentence.scenarioId}"`);
    }
  }

  const patterns: Pattern[] = parsedPatterns.map((pattern) => ({
    ...pattern,
    sentenceIds: pattern.sentenceIds.map((id, index) =>
      requiredResolution(resolveSentence, id, `pattern ${pattern.id}.sentenceIds[${index}]`)
    ),
  }));
  const patternById = uniqueMap(patterns, 'curriculum.patterns', (pattern) => pattern.id);
  const path = normalizePath(parsedPath, new Set(basicsDeckById.keys()), resolveScenario, patterns.length);

  const words = parsedWords;
  const wordById = new Map<string, Word>();
  for (const word of allWords) wordById.set(word.id, word);

  return {
    manifest,
    schemaVersion: manifest.schemaVersion,
    contentVersion: manifest.contentVersion,
    scenarios,
    sentences,
    words,
    tonesets,
    pinyin,
    basicsDecks,
    basicsWords,
    path,
    patterns,
    scenarioById,
    sentenceById,
    wordById,
    basicsDeckById,
    patternById,
  };
}

export const curriculum = buildCurriculum(curriculumSourceBundle);
export const manifest = curriculum.manifest;
export const schemaVersion = curriculum.schemaVersion;
export const contentVersion = curriculum.contentVersion;
export const scenarios = curriculum.scenarios;
export const sentences = curriculum.sentences;
export const words = curriculum.words;
export const tonesets = curriculum.tonesets;
export const pinyin = curriculum.pinyin;
export const basicsDecks = curriculum.basicsDecks;
export const basicsWords = curriculum.basicsWords;
export const pathData = curriculum.path;
export const patterns = curriculum.patterns;
export const scenarioById = curriculum.scenarioById;
export const sentenceById = curriculum.sentenceById;
export const wordById = curriculum.wordById;
export const basicsDeckById = curriculum.basicsDeckById;
export const patternById = curriculum.patternById;

const resolveWord = createAliasResolver('word', manifest.aliases.words, new Set(wordById.keys()));
const resolveSentence = createAliasResolver('sentence', manifest.aliases.sentences, new Set(sentenceById.keys()));
const resolveScenario = createAliasResolver('scenario', manifest.aliases.scenarios, new Set(scenarioById.keys()));

export function resolveWordId(id: string): string | undefined {
  return resolveWord(id);
}

export function resolveSentenceId(id: string): string | undefined {
  return resolveSentence(id);
}

export function resolveScenarioId(id: string): string | undefined {
  return resolveScenario(id);
}

export function getScenario(id: string): Scenario | undefined {
  const resolved = resolveScenarioId(id);
  return resolved === undefined ? undefined : scenarioById.get(resolved);
}

export function getSentence(id: string): Sentence | undefined {
  const resolved = resolveSentenceId(id);
  return resolved === undefined ? undefined : sentenceById.get(resolved);
}

export function getWord(id: string): Word | undefined {
  const resolved = resolveWordId(id);
  return resolved === undefined ? undefined : wordById.get(resolved);
}

export function getBasicsDeck(id: string): BasicsDeck | undefined {
  return basicsDeckById.get(id);
}

/** Return the explicitly named 粵拼 lesson; unknown references are rejected. */
export function pinyinItems(ref: string): PinyinItem[] {
  if (ref === 'initials') return pinyin.initials;
  if (ref === 'finals') return pinyin.finalGroups.flatMap((group) => group.items);
  throw new Error(`Unknown pinyin lesson ref "${ref}"; expected "initials" or "finals"`);
}

export function scenarioSentences(scenarioId: string): Sentence[] {
  const scenario = getScenario(scenarioId);
  if (scenario === undefined) return [];
  return scenario.sentences.map((id) => sentenceById.get(id)).filter((item): item is Sentence => item !== undefined);
}

/** All distinct canonical vocab word IDs taught by a scenario. */
export function scenarioVocab(scenarioId: string): string[] {
  const ids = new Set<string>();
  for (const sentence of scenarioSentences(scenarioId)) {
    for (const wordId of sentence.vocab) ids.add(wordId);
  }
  return [...ids];
}

export function getPattern(id: string): Pattern | undefined {
  return patternById.get(id);
}

const patternBySentence = new Map<string, Pattern>();
for (const pattern of patterns) {
  for (const sentenceId of pattern.sentenceIds) {
    if (!patternBySentence.has(sentenceId)) patternBySentence.set(sentenceId, pattern);
  }
}

/** The first pattern associated with a dialogue sentence, if any. */
export function patternForSentence(sentenceId: string): Pattern | undefined {
  const resolved = resolveSentenceId(sentenceId);
  return resolved === undefined ? undefined : patternBySentence.get(resolved);
}
