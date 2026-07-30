import type { QuizQuestion } from '../../domain/exercises/quizBuilder';
import type { Sentence, Word } from '../../types';

/** How a wrong answer should be booked into the 錯題本. */
export type WrongInfo =
  | { kind: 'sentence'; sentence: Sentence }
  | { kind: 'cloze'; sentence: Sentence; word: Word }
  | { kind: 'dictation'; sentence: Sentence };

export type AnswerHandler = (correct: boolean, wrong?: WrongInfo) => void;

export interface QuestionProps<K extends QuizQuestion['kind']> {
  question: Extract<QuizQuestion, { kind: K }>;
  onAnswer: AnswerHandler;
}
