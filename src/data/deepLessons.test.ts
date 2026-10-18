import { describe, expect, it } from "vitest";
import { curriculumStages } from "./curriculum";
import { deepLessons } from "./deepLessons";

const bannedRegister = /[的是在他]|沒有/u;
const jyutpingToken = /^[a-z]+[1-6]$/;

describe("deep lesson content", () => {
  it("ships every roadmap unit as an available route", () => {
    const units = curriculumStages.flatMap((stage) => stage.units);
    expect(units.every((unit) => unit.status === "ready" && unit.route !== undefined)).toBe(true);
  });

  it("provides five audited phrases for every new deep unit", () => {
    expect(deepLessons).toHaveLength(22);
    expect(deepLessons.every((unit) => unit.phrases.length === 5)).toBe(true);
    const ids = deepLessons.flatMap((unit) => unit.phrases.map((phrase) => phrase.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps Cantonese lines free of written Mandarin register", () => {
    const violations = deepLessons.flatMap((unit) => [unit.title, unit.context, unit.goal, unit.pattern, unit.patternNote, unit.rolePrompt, unit.transferPrompt, unit.repairTip, ...unit.substitutions, ...unit.phrases.flatMap((phrase) => [phrase.hanzi, phrase.note])]).filter((text) => bannedRegister.test(text));
    expect(violations).toEqual([]);
  });

  it("uses valid Jyutping tones and checked-tone constraints", () => {
    const invalid: string[] = [];
    for (const phrase of deepLessons.flatMap((unit) => unit.phrases)) {
      const tokens = phrase.jyutping.toLowerCase().replace(/[^a-z1-6\s]/g, " ").split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        if (!jyutpingToken.test(token)) invalid.push(`${phrase.id}:${token}`);
        const match = token.match(/[ptk]([1-6])$/);
        if (match !== null && !["1", "3", "6"].includes(match[1] ?? "")) invalid.push(`${phrase.id}:checked-${token}`);
      }
    }
    expect(invalid).toEqual([]);
  });
});
