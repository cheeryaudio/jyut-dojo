import { describe, expect, it } from "vitest";
import { readers } from "./index";
import { courseTopics } from "../courses";

describe("life reader editorial checks", () => {
  it("publishes three distinct complete readers for every topic", () => {
    expect(readers).toHaveLength(30);
    expect(new Set(readers.map(reader => reader.id)).size).toBe(30);
    expect(new Set(readers.map(reader => reader.title)).size).toBe(30);
    for (const topic of courseTopics) expect(readers.filter(reader => reader.topicId === topic.id)).toHaveLength(3);
    expect(new Set(readers.flatMap(reader => reader.questions.map(question => question.id))).size).toBe(90);
    for (const reader of readers) {
      expect(reader.paragraphs).toHaveLength(6);
      expect(reader.glossary.length).toBeGreaterThanOrEqual(6);
      expect(reader.questions).toHaveLength(3);
      expect(reader.paragraphs.every(paragraph => paragraph.mandarin.length > 10)).toBe(true);
      if (reader.id.startsWith("reader3-")) {
        expect(reader.paragraphs.reduce((count, paragraph) => count + [...paragraph.hanzi].filter(character => /\p{Script=Han}/u.test(character)).length, 0), reader.id).toBeGreaterThanOrEqual(130);
      }
    }
  });
  it("matches word and paragraph syllables and uses valid Jyutping and checked tones", () => {
    const errors: string[] = [];
    for (const reader of readers) for (const item of [...reader.paragraphs, ...reader.glossary]) {
      const syllables = item.jyutping.replace(/[.,!?;:，。！？、；：]/g, " ").trim().split(/\s+/);
      const characters = [...item.hanzi].filter(character => /[\p{Script=Han}A-Za-z0-9]/u.test(character));
      const count = characters.length;
      if (count !== syllables.length) errors.push(`${reader.id}: ${item.hanzi}: ${count} / ${syllables.length}`);
      syllables.forEach((syllable, index) => {
        // Lexical changed tone: 衫夾 gaap2 (Cantowords, 晾衫). Keep the general
        // checked-tone rule and allow this documented word only.
        const changedTone = syllable === "gaap2" && characters[index] === "夾" && characters[index - 1] === "衫";
        if (!/^[a-z]+[1-6]$/.test(syllable) || (/[ptk][245]$/.test(syllable) && !changedTone)) errors.push(`${reader.id}: ${syllable}`);
      });
    }
    expect(errors).toEqual([]);
  });
  it("has three distinct options, explained answers, and varied answer positions", () => {
    const positions = new Set<number>();
    for (const reader of readers) for (const question of reader.questions) {
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options).size).toBe(3);
      expect(question.options).toContain(question.answer);
      expect(question.explanation.length).toBeGreaterThan(15);
      positions.add(question.options.indexOf(question.answer));
    }
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
});
