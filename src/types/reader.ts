import type { CourseTopicId, CourseWord } from "./course";

export interface Reader {
  id: string;
  topicId: CourseTopicId;
  title: string;
  description: string;
  minutes: number;
  level: 1 | 2 | 3;
  paragraphs: { hanzi: string; jyutping: string; mandarin: string }[];
  glossary: CourseWord[];
  questions: { id: string; prompt: string; options: string[]; answer: string; explanation: string }[];
  takeaway: string;
}
