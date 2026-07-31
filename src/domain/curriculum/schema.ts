import type {
  BasicsDeck,
  CurriculumAliases,
  CurriculumManifest,
  CurriculumSourceFiles,
  FinalGroup,
  PathData,
  PathStage,
  PathUnit,
  Pattern,
  PatternExample,
  PinyinData,
  PinyinItem,
  Scenario,
  Sentence,
  Speaker,
  ToneItem,
  ToneNumber,
  ToneSet,
  UnitType,
  Word,
} from './types';

export class CurriculumSchemaError extends Error {
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'CurriculumSchemaError';
  }
}

type JsonObject = Record<string, unknown>;

function objectAt(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CurriculumSchemaError(path, 'expected an object');
  }
  return value as JsonObject;
}

function arrayAt(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new CurriculumSchemaError(path, 'expected an array');
  return value;
}

function field(object: JsonObject, key: string, path: string): unknown {
  if (!(key in object)) throw new CurriculumSchemaError(`${path}.${key}`, 'is required');
  return object[key];
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new CurriculumSchemaError(path, 'expected a string');
  if (value.length === 0) throw new CurriculumSchemaError(path, 'must not be empty');
  return value;
}

function integerAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new CurriculumSchemaError(path, 'expected an integer');
  }
  return value;
}

function stringArrayAt(value: unknown, path: string): string[] {
  return arrayAt(value, path).map((item, index) => stringAt(item, `${path}[${index}]`));
}

function recordOfStringsAt(value: unknown, path: string): Record<string, string> {
  const object = objectAt(value, path);
  const result: Record<string, string> = {};
  for (const [key, target] of Object.entries(object)) {
    if (key.length === 0) throw new CurriculumSchemaError(path, 'alias IDs must not be empty');
    result[key] = stringAt(target, `${path}.${key}`);
  }
  return result;
}

function enumAt<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string
): T[number] {
  const parsed = stringAt(value, path);
  if (!allowed.includes(parsed)) {
    throw new CurriculumSchemaError(path, `expected one of ${allowed.join(', ')}, got "${parsed}"`);
  }
  return parsed as T[number];
}

function toneAt(value: unknown, path: string): ToneNumber {
  const tone = integerAt(value, path);
  if (tone < 1 || tone > 6) throw new CurriculumSchemaError(path, `expected a tone from 1 to 6, got ${tone}`);
  return tone as ToneNumber;
}

function parseWord(value: unknown, path: string): Word {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    hanzi: stringAt(field(object, 'hanzi', path), `${path}.hanzi`),
    jyutping: stringAt(field(object, 'jyutping', path), `${path}.jyutping`),
    mandarin: stringAt(field(object, 'mandarin', path), `${path}.mandarin`),
    audio: stringAt(field(object, 'audio', path), `${path}.audio`),
    tones: arrayAt(field(object, 'tones', path), `${path}.tones`).map((tone, index) =>
      toneAt(tone, `${path}.tones[${index}]`)
    ),
  };
}

export function parseWordsSource(value: unknown, path: string): Word[] {
  return arrayAt(value, path).map((word, index) => parseWord(word, `${path}[${index}]`));
}

function parseSentence(value: unknown, path: string): Sentence {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    scenarioId: stringAt(field(object, 'scenarioId', path), `${path}.scenarioId`),
    speaker: enumAt(field(object, 'speaker', path), ['A', 'B'] as const, `${path}.speaker`) as Speaker,
    hanzi: stringAt(field(object, 'hanzi', path), `${path}.hanzi`),
    jyutping: stringAt(field(object, 'jyutping', path), `${path}.jyutping`),
    mandarin: stringAt(field(object, 'mandarin', path), `${path}.mandarin`),
    audio: stringAt(field(object, 'audio', path), `${path}.audio`),
    vocab: stringArrayAt(field(object, 'vocab', path), `${path}.vocab`),
  };
}

export function parseSentencesSource(value: unknown, path: string): Sentence[] {
  return arrayAt(value, path).map((sentence, index) => parseSentence(sentence, `${path}[${index}]`));
}

function parseScenario(value: unknown, path: string): Scenario {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    title: stringAt(field(object, 'title', path), `${path}.title`),
    emoji: stringAt(field(object, 'emoji', path), `${path}.emoji`),
    intro: stringAt(field(object, 'intro', path), `${path}.intro`),
    sentences: stringArrayAt(field(object, 'sentences', path), `${path}.sentences`),
  };
}

export function parseScenariosSource(value: unknown, path: string): Scenario[] {
  return arrayAt(value, path).map((scenario, index) => parseScenario(scenario, `${path}[${index}]`));
}

function parseToneItem(value: unknown, path: string): ToneItem {
  const object = objectAt(value, path);
  return {
    tone: toneAt(field(object, 'tone', path), `${path}.tone`),
    hanzi: stringAt(field(object, 'hanzi', path), `${path}.hanzi`),
    mandarin: stringAt(field(object, 'mandarin', path), `${path}.mandarin`),
    jyutping: stringAt(field(object, 'jyutping', path), `${path}.jyutping`),
    audio: stringAt(field(object, 'audio', path), `${path}.audio`),
  };
}

function parseToneSet(value: unknown, path: string): ToneSet {
  const object = objectAt(value, path);
  return {
    syllable: stringAt(field(object, 'syllable', path), `${path}.syllable`),
    items: arrayAt(field(object, 'items', path), `${path}.items`).map((item, index) =>
      parseToneItem(item, `${path}.items[${index}]`)
    ),
  };
}

export function parseToneSetsSource(value: unknown, path: string): ToneSet[] {
  return arrayAt(value, path).map((set, index) => parseToneSet(set, `${path}[${index}]`));
}

function parsePinyinItem(value: unknown, path: string): PinyinItem {
  const object = objectAt(value, path);
  const hintValue = object.hint;
  return {
    jp: stringAt(field(object, 'jp', path), `${path}.jp`),
    hanzi: stringAt(field(object, 'hanzi', path), `${path}.hanzi`),
    jyutping: stringAt(field(object, 'jyutping', path), `${path}.jyutping`),
    mandarin: stringAt(field(object, 'mandarin', path), `${path}.mandarin`),
    ...(hintValue === undefined ? {} : { hint: stringAt(hintValue, `${path}.hint`) }),
    audio: stringAt(field(object, 'audio', path), `${path}.audio`),
  };
}

function parseFinalGroup(value: unknown, path: string): FinalGroup {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    title: stringAt(field(object, 'title', path), `${path}.title`),
    note: stringAt(field(object, 'note', path), `${path}.note`),
    items: arrayAt(field(object, 'items', path), `${path}.items`).map((item, index) =>
      parsePinyinItem(item, `${path}.items[${index}]`)
    ),
  };
}

export function parsePinyinSource(value: unknown, path: string): PinyinData {
  const object = objectAt(value, path);
  return {
    initials: arrayAt(field(object, 'initials', path), `${path}.initials`).map((item, index) =>
      parsePinyinItem(item, `${path}.initials[${index}]`)
    ),
    finalGroups: arrayAt(field(object, 'finalGroups', path), `${path}.finalGroups`).map(
      (group, index) => parseFinalGroup(group, `${path}.finalGroups[${index}]`)
    ),
  };
}

function parseBasicsDeck(value: unknown, path: string): BasicsDeck {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    title: stringAt(field(object, 'title', path), `${path}.title`),
    emoji: stringAt(field(object, 'emoji', path), `${path}.emoji`),
    words: arrayAt(field(object, 'words', path), `${path}.words`).map((word, index) =>
      parseWord(word, `${path}.words[${index}]`)
    ),
  };
}

export function parseBasicsSource(value: unknown, path: string): BasicsDeck[] {
  return arrayAt(value, path).map((deck, index) => parseBasicsDeck(deck, `${path}[${index}]`));
}

function parsePathUnit(value: unknown, path: string): PathUnit {
  const object = objectAt(value, path);
  return {
    type: enumAt(
      field(object, 'type', path),
      ['tones', 'pinyin', 'tonedrill', 'basics', 'scenario', 'grammar'] as const,
      `${path}.type`
    ) as UnitType,
    ref: stringAt(field(object, 'ref', path), `${path}.ref`),
    title: stringAt(field(object, 'title', path), `${path}.title`),
    emoji: stringAt(field(object, 'emoji', path), `${path}.emoji`),
  };
}

function parsePathStage(value: unknown, path: string): PathStage {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    title: stringAt(field(object, 'title', path), `${path}.title`),
    subtitle: stringAt(field(object, 'subtitle', path), `${path}.subtitle`),
    units: arrayAt(field(object, 'units', path), `${path}.units`).map((unit, index) =>
      parsePathUnit(unit, `${path}.units[${index}]`)
    ),
  };
}

export function parsePathSource(value: unknown, path: string): PathData {
  const object = objectAt(value, path);
  return {
    stages: arrayAt(field(object, 'stages', path), `${path}.stages`).map((stage, index) =>
      parsePathStage(stage, `${path}.stages[${index}]`)
    ),
  };
}

function parsePatternExample(value: unknown, path: string): PatternExample {
  const object = objectAt(value, path);
  return {
    hanzi: stringAt(field(object, 'hanzi', path), `${path}.hanzi`),
    jyutping: stringAt(field(object, 'jyutping', path), `${path}.jyutping`),
    mandarin: stringAt(field(object, 'mandarin', path), `${path}.mandarin`),
    audio: stringAt(field(object, 'audio', path), `${path}.audio`),
  };
}

function parsePattern(value: unknown, path: string): Pattern {
  const object = objectAt(value, path);
  return {
    id: stringAt(field(object, 'id', path), `${path}.id`),
    title: stringAt(field(object, 'title', path), `${path}.title`),
    point: stringAt(field(object, 'point', path), `${path}.point`),
    formula: stringAt(field(object, 'formula', path), `${path}.formula`),
    sentenceIds: stringArrayAt(field(object, 'sentenceIds', path), `${path}.sentenceIds`),
    examples: arrayAt(field(object, 'examples', path), `${path}.examples`).map((example, index) =>
      parsePatternExample(example, `${path}.examples[${index}]`)
    ),
  };
}

export function parsePatternsSource(value: unknown, path: string): Pattern[] {
  return arrayAt(value, path).map((pattern, index) => parsePattern(pattern, `${path}[${index}]`));
}

function parseSourceFiles(value: unknown, path: string): CurriculumSourceFiles {
  const object = objectAt(value, path);
  return {
    words: stringArrayAt(field(object, 'words', path), `${path}.words`),
    sentences: stringArrayAt(field(object, 'sentences', path), `${path}.sentences`),
    scenarios: stringArrayAt(field(object, 'scenarios', path), `${path}.scenarios`),
    basics: stringArrayAt(field(object, 'basics', path), `${path}.basics`),
    tones: stringArrayAt(field(object, 'tones', path), `${path}.tones`),
    pinyin: stringArrayAt(field(object, 'pinyin', path), `${path}.pinyin`),
    path: stringArrayAt(field(object, 'path', path), `${path}.path`),
    patterns: stringArrayAt(field(object, 'patterns', path), `${path}.patterns`),
  };
}

function parseAliases(value: unknown, path: string): CurriculumAliases {
  const object = objectAt(value, path);
  return {
    words: recordOfStringsAt(field(object, 'words', path), `${path}.words`),
    sentences: recordOfStringsAt(field(object, 'sentences', path), `${path}.sentences`),
    scenarios: recordOfStringsAt(field(object, 'scenarios', path), `${path}.scenarios`),
  };
}

export function parseCurriculumManifest(value: unknown, path = 'src/data/curriculum.json'): CurriculumManifest {
  const object = objectAt(value, path);
  const schemaVersion = integerAt(field(object, 'schemaVersion', path), `${path}.schemaVersion`);
  if (schemaVersion < 1) {
    throw new CurriculumSchemaError(`${path}.schemaVersion`, 'must be at least 1');
  }
  const contentVersion = stringAt(field(object, 'contentVersion', path), `${path}.contentVersion`);
  if (!/^\d{4}\.\d{2}\.\d{2}(?:[-+][A-Za-z0-9.-]+)?$/.test(contentVersion)) {
    throw new CurriculumSchemaError(
      `${path}.contentVersion`,
      'expected YYYY.MM.DD with an optional release suffix'
    );
  }

  const supportedPath = `${path}.supported`;
  const supported = objectAt(field(object, 'supported', path), supportedPath);
  const localesPath = `${supportedPath}.locales`;
  const locales = objectAt(field(supported, 'locales', supportedPath), localesPath);
  const policyPath = `${path}.idPolicy`;
  const idPolicy = objectAt(field(object, 'idPolicy', path), policyPath);

  return {
    schemaVersion,
    contentVersion,
    sourceFiles: parseSourceFiles(field(object, 'sourceFiles', path), `${path}.sourceFiles`),
    supported: {
      locales: {
        content: stringAt(field(locales, 'content', localesPath), `${localesPath}.content`),
        translations: stringArrayAt(
          field(locales, 'translations', localesPath),
          `${localesPath}.translations`
        ),
      },
      romanizations: stringArrayAt(
        field(supported, 'romanizations', supportedPath),
        `${supportedPath}.romanizations`
      ),
    },
    idPolicy: {
      aliases: stringAt(field(idPolicy, 'aliases', policyPath), `${policyPath}.aliases`),
      deprecation: stringAt(field(idPolicy, 'deprecation', policyPath), `${policyPath}.deprecation`),
    },
    aliases: parseAliases(field(object, 'aliases', path), `${path}.aliases`),
  };
}
