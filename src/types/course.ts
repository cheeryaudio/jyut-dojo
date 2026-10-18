export type CourseTopicId = "first-words" | "time-plans" | "food-drink" | "shopping" | "getting-around" | "home" | "services" | "friends" | "work" | "express-yourself";

export interface CoursePhrase {
  id: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  note?: string;
  audio?: string;
}
export interface CourseWord { hanzi: string; jyutping: string; mandarin: string }
export interface CoursePattern { form: string; explanation: string; example: string }
export interface CourseExercise {
  id: string;
  kind: "meaning" | "response";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}
export interface Course {
  id: string;
  topicId: CourseTopicId;
  level: number;
  title: string;
  description: string;
  minutes: number;
  speakers: [string, string];
  dialogueLength: number;
  phrases: CoursePhrase[];
  words: CourseWord[];
  patterns: CoursePattern[];
  cultureNote: string;
  practicePrompt: string;
  exercises: CourseExercise[];
}
export interface CourseTopic { id: CourseTopicId; name: string; subtitle: string; description: string; scene: number }
