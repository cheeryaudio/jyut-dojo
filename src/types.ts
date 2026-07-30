export type {
  BasicsDeck,
  Curriculum,
  CurriculumAliases,
  CurriculumJsonSource,
  CurriculumManifest,
  CurriculumSourceBundle,
  CurriculumSourceFiles,
  CurriculumSourceGroup,
  FinalGroup,
  PathData,
  PathStage,
  PathUnit,
  Pattern,
  PatternExample,
  PinyinData,
  PinyinItem,
  PinyinLessonRef,
  Scenario,
  Sentence,
  Speaker,
  ToneItem,
  ToneNumber,
  ToneSet,
  UnitType,
  Word,
} from './domain/curriculum/types';

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
  /** epoch ms of the latest scheduling change */
  updatedAt: number;
}
