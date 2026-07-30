export type Speaker = 'A' | 'B';
export type ToneNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type PinyinLessonRef = 'initials' | 'finals';
export type UnitType = 'tones' | 'pinyin' | 'tonedrill' | 'basics' | 'scenario' | 'grammar';

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  intro: string;
  sentences: string[];
}

export interface Sentence {
  id: string;
  scenarioId: string;
  speaker: Speaker;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  /** Canonical word IDs after alias resolution. */
  vocab: string[];
}

export interface Word {
  id: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  tones: ToneNumber[];
}

export interface ToneItem {
  tone: ToneNumber;
  hanzi: string;
  mandarin: string;
  jyutping: string;
  audio: string;
}

export interface ToneSet {
  syllable: string;
  items: ToneItem[];
}

/** One taught 粵拼 symbol (initial or final). */
export interface PinyinItem {
  jp: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  /** Only present on initials. */
  hint?: string;
  audio: string;
}

/** A group of finals sharing a vowel family. */
export interface FinalGroup {
  id: string;
  title: string;
  note: string;
  items: PinyinItem[];
}

export interface PinyinData {
  initials: PinyinItem[];
  finalGroups: FinalGroup[];
}

/** A vocabulary deck of Word-shaped basics (numbers/time/people…). */
export interface BasicsDeck {
  id: string;
  title: string;
  emoji: string;
  words: Word[];
}

export interface PathUnit {
  type: UnitType;
  ref: string;
  title: string;
  emoji: string;
}

export interface PathStage {
  id: string;
  title: string;
  subtitle: string;
  units: PathUnit[];
}

export interface PathData {
  stages: PathStage[];
}

/** One worked example sentence attached to a grammar pattern. */
export interface PatternExample {
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
}

/** A grammar / sentence-pattern (句型) card. */
export interface Pattern {
  id: string;
  title: string;
  /** Simplified-Mandarin explanation of the point. */
  point: string;
  /** Compact formula, e.g. "有冇 + 名词 ？". */
  formula: string;
  /** Canonical sentence IDs after alias resolution. */
  sentenceIds: string[];
  examples: PatternExample[];
}

export interface CurriculumSourceFiles {
  words: string[];
  sentences: string[];
  scenarios: string[];
  basics: string[];
  tones: string[];
  pinyin: string[];
  path: string[];
  patterns: string[];
}

export type CurriculumSourceGroup = keyof CurriculumSourceFiles;

export interface CurriculumAliases {
  /** Deprecated word ID -> current word ID. */
  words: Record<string, string>;
  /** Deprecated sentence ID -> current sentence ID. */
  sentences: Record<string, string>;
  /** Deprecated scenario ID -> current scenario ID. */
  scenarios: Record<string, string>;
}

export interface CurriculumManifest {
  schemaVersion: number;
  contentVersion: string;
  sourceFiles: CurriculumSourceFiles;
  supported: {
    locales: {
      content: string;
      translations: string[];
    };
    romanizations: string[];
  };
  idPolicy: {
    aliases: string;
    deprecation: string;
  };
  aliases: CurriculumAliases;
}

/** A named JSON source passed into the shared parser/registry builder. */
export interface CurriculumJsonSource {
  file: string;
  data: unknown;
}

/** Raw source files before runtime parsing and cross-reference normalization. */
export interface CurriculumSourceBundle {
  manifest: CurriculumJsonSource;
  words: CurriculumJsonSource[];
  sentences: CurriculumJsonSource[];
  scenarios: CurriculumJsonSource[];
  basics: CurriculumJsonSource[];
  tones: CurriculumJsonSource[];
  pinyin: CurriculumJsonSource[];
  path: CurriculumJsonSource[];
  patterns: CurriculumJsonSource[];
}

/** The single normalized curriculum consumed by application code. */
export interface Curriculum {
  manifest: CurriculumManifest;
  schemaVersion: number;
  contentVersion: string;
  scenarios: Scenario[];
  sentences: Sentence[];
  words: Word[];
  tonesets: ToneSet[];
  pinyin: PinyinData;
  basicsDecks: BasicsDeck[];
  basicsWords: Word[];
  path: PathData;
  patterns: Pattern[];
  scenarioById: ReadonlyMap<string, Scenario>;
  sentenceById: ReadonlyMap<string, Sentence>;
  wordById: ReadonlyMap<string, Word>;
  basicsDeckById: ReadonlyMap<string, BasicsDeck>;
  patternById: ReadonlyMap<string, Pattern>;
}
