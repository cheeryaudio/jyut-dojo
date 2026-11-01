import { courses } from "../data/courses";
import { sentences } from "../data";
import type { Course, CoursePhrase, CourseWord } from "../types/course";

const staticAudio = new Map(
  sentences.map(sentence => [sentence.hanzi.replace(/[\s，。！？、；：]/g, ""), sentence.audio]),
);

export const resolvePhraseAudio = (phrase: CoursePhrase): string | undefined =>
  phrase.audio ?? staticAudio.get(phrase.hanzi.replace(/[\s，。！？、；：]/g, ""));

export interface ListeningDrill {
  id: string;
  courseId: string;
  courseTitle: string;
  phraseId: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio?: string;
  options: string[];
  answer: string;
}

export interface SentencePuzzleDrill {
  id: string;
  courseId: string;
  courseTitle: string;
  phraseId: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio?: string;
  targetChunks: string[];
  shuffledChunks: string[];
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicShuffle<T>(items: readonly T[], seedKey: string): T[] {
  const result = [...items];
  let seed = stableHash(seedKey) || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export function tokenizeCantonesePhrase(hanzi: string, courseWords: readonly CourseWord[] = []): string[] {
  const clean = hanzi.replace(/[\s，。！？、；：…「」『』（）,.!?]/g, "");
  if (!clean) return [];

  const dictionary = [...new Set(
    courseWords
      .map(w => w.hanzi.replace(/[\s，。！？、；：…（）]/g, ""))
      .filter(w => w.length >= 2 && w.length <= 4),
  )].sort((a, b) => b.length - a.length);

  const rawChunks: string[] = [];
  let index = 0;
  let buffer = "";

  const flushBuffer = () => {
    let pos = 0;
    while (pos < buffer.length) {
      const remaining = buffer.length - pos;
      const step = remaining === 3 ? 2 : remaining >= 2 ? 2 : 1;
      rawChunks.push(buffer.slice(pos, pos + step));
      pos += step;
    }
    buffer = "";
  };

  while (index < clean.length) {
    const matched = dictionary.find(word => clean.startsWith(word, index));
    if (matched) {
      if (buffer) flushBuffer();
      rawChunks.push(matched);
      index += matched.length;
    } else {
      buffer += clean[index];
      index += 1;
    }
  }
  if (buffer) flushBuffer();

  while (rawChunks.length < 3 && rawChunks.some(chunk => chunk.length >= 2)) {
    const longestIndex = rawChunks.reduce(
      (bestIdx, chunk, idx, arr) => (chunk.length > arr[bestIdx]!.length ? idx : bestIdx),
      0,
    );
    const target = rawChunks[longestIndex]!;
    const mid = Math.ceil(target.length / 2);
    rawChunks.splice(longestIndex, 1, target.slice(0, mid), target.slice(mid));
  }

  while (rawChunks.length > 7) {
    let mergeIdx = rawChunks.findIndex((chunk, idx) => idx < rawChunks.length - 1 && chunk.length + rawChunks[idx + 1]!.length <= 3);
    if (mergeIdx === -1) mergeIdx = rawChunks.length - 2;
    rawChunks.splice(mergeIdx, 2, `${rawChunks[mergeIdx]}${rawChunks[mergeIdx + 1]}`);
  }

  return rawChunks;
}

export function buildListeningExercises(course: Course, limit = 6): ListeningDrill[] {
  const poolMandarin = [
    ...new Set([
      ...course.phrases.map(p => p.mandarin),
      ...courses.filter(c => c.topicId === course.topicId).flatMap(c => c.phrases.map(p => p.mandarin)),
      ...courses[0]!.phrases.map(p => p.mandarin),
    ]),
  ];

  return course.phrases.slice(0, limit).map(phrase => {
    const distractors = deterministicShuffle(
      poolMandarin.filter(item => item !== phrase.mandarin),
      `listen-distractors:${phrase.id}`,
    ).slice(0, 3);
    const options = deterministicShuffle([phrase.mandarin, ...distractors], `listen-options:${phrase.id}`);
    return {
      id: `listen:${phrase.id}`,
      courseId: course.id,
      courseTitle: course.title,
      phraseId: phrase.id,
      hanzi: phrase.hanzi,
      jyutping: phrase.jyutping,
      mandarin: phrase.mandarin,
      audio: resolvePhraseAudio(phrase),
      options,
      answer: phrase.mandarin,
    };
  });
}

export function buildSentencePuzzleExercises(course: Course, limit = 6): SentencePuzzleDrill[] {
  const candidates = course.phrases.filter(phrase => {
    const clean = phrase.hanzi.replace(/[\s，。！？、；：…]/g, "");
    return clean.length >= 4;
  });

  return candidates.slice(0, limit).map(phrase => {
    const targetChunks = tokenizeCantonesePhrase(phrase.hanzi, course.words);
    let shuffledChunks = deterministicShuffle(targetChunks, `puzzle:${phrase.id}`);
    if (shuffledChunks.length > 1 && shuffledChunks.join("|") === targetChunks.join("|")) {
      shuffledChunks = [...shuffledChunks.slice(1), shuffledChunks[0]!];
    }
    return {
      id: `puzzle:${phrase.id}`,
      courseId: course.id,
      courseTitle: course.title,
      phraseId: phrase.id,
      hanzi: phrase.hanzi,
      jyutping: phrase.jyutping,
      mandarin: phrase.mandarin,
      audio: resolvePhraseAudio(phrase),
      targetChunks,
      shuffledChunks,
    };
  });
}
