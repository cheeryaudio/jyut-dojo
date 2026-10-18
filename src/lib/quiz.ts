import type { Sentence } from "../types/domain";

export interface ChoiceQuestion {
  target: Sentence;
  options: Sentence[];
}

export interface DialogueQuestion {
  prompt: Sentence;
  answer: Sentence;
  options: Sentence[];
}

const uniqueById = (items: Sentence[]): Sentence[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const fourChoices = (sentences: Sentence[], answerIndex: number, offsets: number[]): Sentence[] => {
  const answer = sentences[answerIndex];
  if (answer === undefined) throw new Error("Quiz answer sentence is missing");
  const choices = uniqueById([
    answer,
    ...offsets.map((offset) => sentences[(answerIndex + offset) % sentences.length]).filter((item): item is Sentence => item !== undefined),
  ]);
  return [choices[2], choices[0], choices[3], choices[1]].filter((item): item is Sentence => item !== undefined);
};

export const buildListenQuestion = (sentences: Sentence[]): ChoiceQuestion => {
  const targetIndex = 2;
  const target = sentences[targetIndex];
  if (target === undefined) throw new Error("Scenario needs at least three sentences");
  return { target, options: fourChoices(sentences, targetIndex, [2, 4, 6]) };
};

export const buildReorderSentence = (sentences: Sentence[]): Sentence => {
  const target = sentences[4];
  if (target === undefined) throw new Error("Scenario needs at least five sentences");
  return target;
};

export const buildDialogueQuestion = (sentences: Sentence[]): DialogueQuestion => {
  const promptIndex = 7;
  const answerIndex = 8;
  const prompt = sentences[promptIndex];
  const answer = sentences[answerIndex];
  if (prompt === undefined || answer === undefined) throw new Error("Scenario needs at least nine sentences");
  return { prompt, answer, options: fourChoices(sentences, answerIndex, [2, 4, 6]) };
};
