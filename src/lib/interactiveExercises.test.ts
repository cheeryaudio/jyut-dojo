import { describe, expect, it } from "vitest";
import { courses } from "../data/courses";
import {
  buildListeningExercises,
  buildSentencePuzzleExercises,
  tokenizeCantonesePhrase,
} from "./interactiveExercises";

describe("interactive listening and Cantonese sentence puzzle generators", () => {
  it("tokenizes Cantonese phrases into 3 to 7 clean chunks that reconstruct the exact characters", () => {
    for (const course of courses.slice(0, 15)) {
      for (const phrase of course.phrases) {
        const chunks = tokenizeCantonesePhrase(phrase.hanzi, course.words);
        const clean = phrase.hanzi.replace(/[\s，。！？、；：…「」『』（）,.!?]/g, "");
        expect(chunks.join("")).toBe(clean);
        if (clean.length >= 4) {
          expect(chunks.length).toBeGreaterThanOrEqual(2);
          expect(chunks.length).toBeLessThanOrEqual(7);
        }
      }
    }
  });

  it("builds listening drills with 4 unique options including the correct Mandarin meaning", () => {
    for (const course of courses.slice(0, 10)) {
      const drills = buildListeningExercises(course, 6);
      expect(drills).toHaveLength(6);
      for (const drill of drills) {
        expect(drill.options).toHaveLength(4);
        expect(new Set(drill.options).size).toBe(4);
        expect(drill.options).toContain(drill.answer);
      }
    }
  });

  it("builds sentence puzzles where shuffled chunks differ in order from target chunks", () => {
    for (const course of courses.slice(0, 10)) {
      const puzzles = buildSentencePuzzleExercises(course, 6);
      expect(puzzles.length).toBeGreaterThan(0);
      for (const puzzle of puzzles) {
        expect([...puzzle.shuffledChunks].sort()).toEqual([...puzzle.targetChunks].sort());
        if (new Set(puzzle.targetChunks).size > 1) {
          expect(puzzle.shuffledChunks.join("|")).not.toBe(puzzle.targetChunks.join("|"));
        }
      }
    }
  });
});
