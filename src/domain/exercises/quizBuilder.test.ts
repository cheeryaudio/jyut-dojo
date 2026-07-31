import { describe, expect, it } from 'vitest';
import { buildQuiz, quizStars, type QuizQuestion } from './quizBuilder';
import type { RandomSource } from './random';
import type { Sentence, Word } from '../../types';

/** Deterministic pseudo-random source so a quiz build is reproducible in tests. */
function seeded(seed: number): RandomSource {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const WORDS: Word[] = [
  { id: 'w-nei', hanzi: '你', jyutping: 'nei5', mandarin: '你', audio: 'a.mp3', tones: [5] },
  { id: 'w-hou', hanzi: '好', jyutping: 'hou2', mandarin: '好', audio: 'b.mp3', tones: [2] },
  { id: 'w-sik', hanzi: '食', jyutping: 'sik6', mandarin: '吃', audio: 'c.mp3', tones: [6] },
  { id: 'w-faan', hanzi: '飯', jyutping: 'faan6', mandarin: '饭', audio: 'd.mp3', tones: [6] },
  { id: 'w-cha', hanzi: '茶', jyutping: 'caa4', mandarin: '茶', audio: 'e.mp3', tones: [4] },
];

function sentence(index: number, hanzi: string, jyutping: string, vocab: string[]): Sentence {
  return {
    id: `s${index}`,
    scenarioId: 'greet',
    speaker: index % 2 === 0 ? 'A' : 'B',
    hanzi,
    jyutping,
    mandarin: `句${index}`,
    audio: `s${index}.mp3`,
    vocab,
  };
}

const SENTENCES: Sentence[] = [
  sentence(1, '你好', 'nei5 hou2', ['w-nei', 'w-hou']),
  sentence(2, '你食飯', 'nei5 sik6 faan6', ['w-nei', 'w-sik', 'w-faan']),
  sentence(3, '好食', 'hou2 sik6', ['w-hou', 'w-sik']),
  sentence(4, '飲茶好', 'jam2 caa4 hou2', ['w-cha', 'w-hou']),
  sentence(5, '食茶飯', 'sik6 caa4 faan6', ['w-sik', 'w-cha', 'w-faan']),
  sentence(6, '你飲茶', 'nei5 jam2 caa4', ['w-nei', 'w-cha']),
];

const getWord = (id: string): Word | undefined => WORDS.find((word) => word.id === id);

function countKinds(questions: QuizQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const question of questions) counts[question.kind] = (counts[question.kind] ?? 0) + 1;
  return counts;
}

describe('buildQuiz', () => {
  it('produces the full mix for a healthy scenario', () => {
    const questions = buildQuiz(SENTENCES, { getWord, random: seeded(7) });
    const counts = countKinds(questions);
    expect(counts.listen).toBe(3);
    expect(counts.order).toBe(3);
    expect(counts.chain).toBe(3);
    expect(counts.cloze).toBe(3);
    expect(counts.dictation).toBe(3);
    expect(questions).toHaveLength(15);
  });

  it('always includes the correct answer among the options', () => {
    const questions = buildQuiz(SENTENCES, { getWord, random: seeded(21) });
    for (const question of questions) {
      if (question.kind === 'listen') {
        expect(question.options.map((o) => o.id)).toContain(question.sentence.id);
        expect(new Set(question.options.map((o) => o.id)).size).toBe(question.options.length);
      }
      if (question.kind === 'chain') {
        expect(question.options.map((o) => o.id)).toContain(question.answer.id);
        expect(question.options.map((o) => o.id)).not.toContain(question.prompt.id);
      }
      if (question.kind === 'cloze') {
        expect(question.options.map((o) => o.id)).toContain(question.word.id);
        expect(question.options).toHaveLength(4);
        expect(question.blanked).not.toBe(question.sentence.hanzi);
      }
    }
  });

  it('never asks to reorder or transcribe a single-syllable sentence', () => {
    const oneSyllable = [
      sentence(1, '好', 'hou2', ['w-hou']),
      sentence(2, '食', 'sik6', ['w-sik']),
      sentence(3, '茶', 'caa4', ['w-cha']),
    ];
    const questions = buildQuiz(oneSyllable, { getWord, random: seeded(3) });
    expect(questions.some((q) => q.kind === 'order' || q.kind === 'dictation')).toBe(false);
  });

  it('drops cloze questions when the scenario lacks four distinct choices', () => {
    const thin = [
      sentence(1, '你好', 'nei5 hou2', ['w-nei', 'w-hou']),
      sentence(2, '好好', 'hou2 hou2', ['w-hou']),
    ];
    const questions = buildQuiz(thin, { getWord, random: seeded(5) });
    expect(questions.some((q) => q.kind === 'cloze')).toBe(false);
  });

  it('returns nothing for an empty scenario instead of throwing', () => {
    expect(buildQuiz([], { getWord, random: seeded(1) })).toEqual([]);
  });

  it('honours an explicit mix', () => {
    const questions = buildQuiz(SENTENCES, {
      getWord,
      random: seeded(11),
      mix: { listen: 1, order: 0, chain: 0, cloze: 0, dictation: 0 },
    });
    expect(countKinds(questions)).toEqual({ listen: 1 });
  });
});

describe('quizStars', () => {
  it('maps score ratios to stars', () => {
    expect(quizStars(15, 15)).toBe(3);
    expect(quizStars(14, 15)).toBe(3);
    expect(quizStars(11, 15)).toBe(2);
    expect(quizStars(8, 15)).toBe(1);
    expect(quizStars(7, 15)).toBe(0);
  });

  it('is safe for an empty quiz', () => {
    expect(quizStars(0, 0)).toBe(0);
  });
});
