import { describe, expect, it } from "vitest";
import { courses } from "../data/courses";
import {
  alignChunksWithJyutping,
  buildListeningExercises,
  buildSentencePuzzleExercises,
  tokenizeCantonesePhrase,
} from "./interactiveExercises";

describe("interactive listening and Cantonese sentence puzzle generators", () => {
  it("keeps fixed Cantonese compounds and clause boundaries intact instead of splitting mid-word", () => {
    expect(tokenizeCantonesePhrase("呢件衫可唔可以試？")).toEqual(["呢件衫", "可唔可以", "試"]);
    expect(tokenizeCantonesePhrase("唔好意思，我遲咗少少。")).toEqual(["唔好意思", "我", "遲咗", "少少"]);
    expect(tokenizeCantonesePhrase("早晨！咁早出門口？")).toEqual(["早晨", "咁早", "出門口"]);
    expect(tokenizeCantonesePhrase("可以，試身室喺入面。")).toEqual(["可以", "試身室", "喺", "入面"]);
  });

  it("tokenizes Cantonese phrases across all 90 lessons into 2 to 7 chunks with aligned Jyutping", () => {
    for (const course of courses) {
      for (const phrase of course.phrases) {
        const chunks = tokenizeCantonesePhrase(phrase.hanzi, course.words);
        const clean = phrase.hanzi.replace(/[\s，。！？、；：…「」『』（）,.!?]/g, "");
        expect(chunks.join("")).toBe(clean);
        if (clean.length >= 4) {
          expect(chunks.length).toBeGreaterThanOrEqual(2);
          expect(chunks.length).toBeLessThanOrEqual(7);
        }
        const tokens = alignChunksWithJyutping(chunks, phrase.jyutping);
        expect(tokens).toHaveLength(chunks.length);
        expect(tokens.every(t => t.jyutping.length > 0)).toBe(true);
        expect(tokens.map(t => t.jyutping).join(" ")).toBe(phrase.jyutping.trim().replace(/\s+/g, " "));
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

  it("builds sentence puzzles with aligned Jyutping tokens and shuffled order", () => {
    for (const course of courses.slice(0, 10)) {
      const puzzles = buildSentencePuzzleExercises(course, 6);
      expect(puzzles.length).toBeGreaterThan(0);
      for (const puzzle of puzzles) {
        expect([...puzzle.shuffledChunks].sort()).toEqual([...puzzle.targetChunks].sort());
        expect(puzzle.shuffledTokens).toHaveLength(puzzle.shuffledChunks.length);
        if (new Set(puzzle.targetChunks).size > 1) {
          expect(puzzle.shuffledChunks.join("|")).not.toBe(puzzle.targetChunks.join("|"));
        }
      }
    }
  });
});
