export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  intro: string;
  sentences: string[];
}

export type Speaker = 'A' | 'B';

export interface Sentence {
  id: string;
  scenarioId: string;
  speaker: Speaker;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  /** word ids */
  vocab: string[];
}

export interface Word {
  id: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  tones: number[];
}

export interface ToneItem {
  tone: number;
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
  /** only present on initials */
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

export type UnitType = 'tones' | 'pinyin' | 'tonedrill' | 'basics' | 'scenario' | 'grammar';

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
  /** compact formula, e.g. "有冇 + 名词 ？" */
  formula: string;
  /** sentence ids (from the dialogue data) this pattern shows up in */
  sentenceIds: string[];
  examples: PatternExample[];
}

/** SM-2 (FSRS-lite) scheduling record for one vocabulary word. */
export interface ReviewCard {
  wordId: string;
  /** ISO date-time the card is next due. */
  due: string;
  /** current interval in days */
  interval: number;
  /** ease factor, floor 1.3, start 2.5 */
  ease: number;
  /** successful repetitions in a row */
  reps: number;
  /** times the card was forgotten */
  lapses: number;
}
