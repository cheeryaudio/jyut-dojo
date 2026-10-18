import type { Course, CoursePhrase, CourseTopicId } from "../../types/course";

export type PhraseInput = [hanzi: string, jyutping: string, mandarin: string, note?: string];
export interface CourseInput {
  id: string;
  topicId: CourseTopicId;
  level: number;
  title: string;
  description: string;
  minutes?: number;
  speakers: [string, string];
  dialogueLength?: number;
  phrases: PhraseInput[];
  words: [hanzi: string, jyutping: string, mandarin: string][];
  patterns: [form: string, explanation: string, example: string][];
  cultureNote: string;
  practicePrompt: string;
}

const rotatedOptions = (values: string[], seed: number): string[] => {
  const unique = [...new Set(values)];
  const offset = seed % unique.length;
  return [...unique.slice(offset), ...unique.slice(0, offset)];
};

export function defineCourse(input: CourseInput): Course {
  const phrases: CoursePhrase[] = input.phrases.map(([hanzi, jyutping, mandarin, note], index) => ({ id: `${input.id}-${index + 1}`, hanzi, jyutping, mandarin, note }));
  const salt = [...input.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const meaning = [0, 4, 8].map((index, order) => {
    const target = phrases[index]!;
    return { id: `${input.id}-meaning-${order}`, kind: "meaning" as const, prompt: `「${target.hanzi}」是什么意思？`, options: rotatedOptions([target.mandarin, phrases[(index + 3) % phrases.length]!.mandarin, phrases[(index + 7) % phrases.length]!.mandarin], salt + order), answer: target.mandarin, explanation: `${target.hanzi}：${target.mandarin}${target.note ? ` ${target.note}` : ""}` };
  });
  const response = [1, 3, 5].map((index, order) => {
    const target = phrases[index]!;
    const previous = phrases[index - 1]!;
    return { id: `${input.id}-response-${order}`, kind: "response" as const, prompt: `对方说「${previous.hanzi}」。按本课对话，怎样接下一句？`, options: rotatedOptions([target.hanzi, phrases[(index + 4) % phrases.length]!.hanzi, phrases[(index + 8) % phrases.length]!.hanzi], salt + order + 1), answer: target.hanzi, explanation: `本段对话的回应是「${target.hanzi}」，意思是“${target.mandarin}”。` };
  });
  return { ...input, minutes: input.minutes ?? 12, dialogueLength: input.dialogueLength ?? 8, phrases, words: input.words.map(([hanzi, jyutping, mandarin]) => ({ hanzi, jyutping, mandarin })), patterns: input.patterns.map(([form, explanation, example]) => ({ form, explanation, example })), exercises: [meaning[0]!, response[0]!, meaning[1]!, response[1]!, meaning[2]!, response[2]!] };
}
