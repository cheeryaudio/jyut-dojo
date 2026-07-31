/**
 * Scenario quiz composition.
 *
 * Pure and dependency-injected so the mix of question types can be unit-tested
 * without React, audio, or the curriculum registry. The page only renders what
 * this builder returns.
 */
import { blankOut, clozeHosts } from '../../lib/cloze';
import { toSyllables } from '../../lib/dictation';
import type { Sentence, Word } from '../../types';
import { defaultRandom, shuffle, type RandomSource } from './random';

export type QuizQuestion =
  | { kind: 'listen'; sentence: Sentence; options: Sentence[] }
  | { kind: 'order'; sentence: Sentence }
  | { kind: 'chain'; prompt: Sentence; answer: Sentence; options: Sentence[] }
  | { kind: 'cloze'; sentence: Sentence; word: Word; blanked: string; options: Word[] }
  | { kind: 'dictation'; sentence: Sentence };

export type QuizQuestionKind = QuizQuestion['kind'];

export type WordLookup = (id: string) => Word | undefined;

/** How many questions of each kind a full quiz aims for. */
export interface QuizMix {
  listen: number;
  order: number;
  chain: number;
  cloze: number;
  dictation: number;
}

export const DEFAULT_QUIZ_MIX: QuizMix = {
  listen: 3,
  order: 3,
  chain: 3,
  cloze: 3,
  dictation: 3,
};

export interface BuildQuizOptions {
  getWord: WordLookup;
  random?: RandomSource;
  mix?: Partial<QuizMix>;
}

/** Choices per multiple-choice question, correct answer included. */
const LISTEN_CHOICES = 4;
const CHAIN_CHOICES = 3;
const CLOZE_CHOICES = 4;

function sampleOthers(
  pool: Sentence[],
  exclude: ReadonlySet<string>,
  count: number,
  random: RandomSource
): Sentence[] {
  return shuffle(
    pool.filter((sentence) => !exclude.has(sentence.id)),
    random
  ).slice(0, count);
}

function syllableCount(sentence: Sentence): number {
  return toSyllables(sentence.jyutping).length;
}

/** Shortest sentences first: word-order and dictation puzzles stay fair. */
function shortestFirst(sentences: Sentence[]): Sentence[] {
  return [...sentences].sort((a, b) => syllableCount(a) - syllableCount(b));
}

function buildListen(
  sentences: Sentence[],
  count: number,
  random: RandomSource
): Extract<QuizQuestion, { kind: 'listen' }>[] {
  const out: Extract<QuizQuestion, { kind: 'listen' }>[] = [];
  for (const sentence of shuffle(sentences, random).slice(0, count)) {
    const others = sampleOthers(sentences, new Set([sentence.id]), LISTEN_CHOICES - 1, random);
    // A single-choice question is not a question; skip rather than fake it.
    if (others.length === 0) continue;
    out.push({ kind: 'listen', sentence, options: shuffle([sentence, ...others], random) });
  }
  return out;
}

function buildOrder(
  sentences: Sentence[],
  count: number,
  random: RandomSource
): Extract<QuizQuestion, { kind: 'order' }>[] {
  const shortest = shortestFirst(sentences).slice(0, count + 2);
  return shuffle(shortest, random)
    .slice(0, count)
    .filter((sentence) => syllableCount(sentence) > 1)
    .map((sentence) => ({ kind: 'order', sentence }));
}

function buildChain(
  sentences: Sentence[],
  count: number,
  random: RandomSource
): Extract<QuizQuestion, { kind: 'chain' }>[] {
  const startIndexes = shuffle(
    sentences.map((_, index) => index).filter((index) => index < sentences.length - 1),
    random
  ).slice(0, count);

  const out: Extract<QuizQuestion, { kind: 'chain' }>[] = [];
  for (const index of startIndexes) {
    const prompt = sentences[index];
    const answer = sentences[index + 1];
    const others = sampleOthers(
      sentences,
      new Set([answer.id, prompt.id]),
      CHAIN_CHOICES - 1,
      random
    );
    if (others.length === 0) continue;
    out.push({ kind: 'chain', prompt, answer, options: shuffle([answer, ...others], random) });
  }
  return out;
}

function buildCloze(
  sentences: Sentence[],
  count: number,
  getWord: WordLookup,
  random: RandomSource
): Extract<QuizQuestion, { kind: 'cloze' }>[] {
  const hosts = clozeHosts(sentences, getWord);
  const vocabWords = [
    ...new Map(
      sentences
        .flatMap((sentence) => sentence.vocab)
        .map((id) => getWord(id))
        .filter((word): word is Word => word !== undefined)
        .map((word) => [word.id, word])
    ).values(),
  ];

  const out: Extract<QuizQuestion, { kind: 'cloze' }>[] = [];
  for (const { sentence, wordIds } of shuffle(hosts, random)) {
    if (out.length >= count) break;
    const word = getWord(shuffle(wordIds, random)[0]);
    if (!word) continue;
    const distractors = shuffle(
      vocabWords.filter((candidate) => candidate.id !== word.id),
      random
    ).slice(0, CLOZE_CHOICES - 1);
    // Fewer than 4 plausible choices makes the answer guessable; drop the item.
    if (distractors.length < CLOZE_CHOICES - 1) continue;
    out.push({
      kind: 'cloze',
      sentence,
      word,
      blanked: blankOut(sentence.hanzi, word.hanzi),
      options: shuffle([word, ...distractors], random),
    });
  }
  return out;
}

function buildDictation(
  sentences: Sentence[],
  count: number,
  random: RandomSource
): Extract<QuizQuestion, { kind: 'dictation' }>[] {
  const shortest = shortestFirst(sentences).slice(0, count * 2);
  return shuffle(shortest, random)
    .slice(0, count)
    .filter((sentence) => syllableCount(sentence) > 1)
    .map((sentence) => ({ kind: 'dictation', sentence }));
}

/** Compose one scenario quiz. Returns an empty list when the scenario has no usable sentences. */
export function buildQuiz(sentences: Sentence[], options: BuildQuizOptions): QuizQuestion[] {
  const random = options.random ?? defaultRandom;
  const mix: QuizMix = { ...DEFAULT_QUIZ_MIX, ...options.mix };
  if (sentences.length === 0) return [];

  const questions: QuizQuestion[] = [
    ...buildListen(sentences, mix.listen, random),
    ...buildOrder(sentences, mix.order, random),
    ...buildChain(sentences, mix.chain, random),
    ...buildCloze(sentences, mix.cloze, options.getWord, random),
    ...buildDictation(sentences, mix.dictation, random),
  ];

  return shuffle(questions, random);
}

/** Stars awarded for a finished quiz: 3 at 90%, 2 at 70%, 1 at 50%. */
export function quizStars(score: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = score / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}
