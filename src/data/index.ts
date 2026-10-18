import scenariosJson from "./scenarios.json";
import sentencesJson from "./sentences.json";
import wordsJson from "./words.json";
import tonesJson from "./tones.json";
import type { Scenario, Sentence, ToneItem, Word } from "../types/domain";

export const scenarios: Scenario[] = scenariosJson;
export const sentences: Sentence[] = sentencesJson;
export const words: Word[] = wordsJson;
export const toneItems: ToneItem[] = tonesJson;

export const sentenceById = new Map(sentences.map((sentence) => [sentence.id, sentence]));
export const wordById = new Map(words.map((word) => [word.id, word]));
