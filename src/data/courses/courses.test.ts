import { describe, expect, it } from "vitest";
import { courses, courseTopics, uniqueCoursePhrases, uniqueCourseWords } from "./index";

describe("scene course publication checks", () => {
  it("publishes sixty real courses in ten complete topics with unique identifiers", () => {
    expect(courses).toHaveLength(60);
    expect(courseTopics).toHaveLength(10);
    expect(new Set(courses.map(course => course.id)).size).toBe(courses.length);
    expect(new Set(courses.flatMap(course => course.phrases.map(phrase => phrase.id))).size).toBe(courses.flatMap(course => course.phrases).length);
    for (const topic of courseTopics) expect(courses.filter(course => course.topicId === topic.id), topic.name).toHaveLength(6);
  });
  it("contains full dialogues, vocabulary, grammar and meaningful practice in every lesson", () => {
    for (const course of courses) {
      expect(course.phrases.length, course.id).toBeGreaterThanOrEqual(12);
      expect(course.dialogueLength, course.id).toBeGreaterThanOrEqual(8);
      expect(course.dialogueLength % 2, course.id).toBe(0);
      expect(course.dialogueLength, course.id).toBeLessThanOrEqual(course.phrases.length);
      expect(course.words.length, course.id).toBeGreaterThanOrEqual(10);
      expect(course.patterns.length, course.id).toBeGreaterThanOrEqual(2);
      expect(course.exercises, course.id).toHaveLength(6);
      expect(course.cultureNote.length, course.id).toBeGreaterThan(15);
      expect(course.practicePrompt.length, course.id).toBeGreaterThan(15);
      for (const exercise of course.exercises) {
        expect(exercise.options, exercise.id).toHaveLength(3);
        expect(exercise.options, exercise.id).toContain(exercise.answer);
        expect(new Set(exercise.options).size, exercise.id).toBe(3);
      }
    }
  });
  it("uses valid Jyutping tone digits and checked-syllable tones across phrases and words", () => {
    const errors: string[] = [];
    for (const course of courses) for (const item of [...course.phrases, ...course.words]) {
      const syllables = item.jyutping.replace(/[.,!?;:，。！？、；：]/g, " ").trim().split(/\s+/);
      for (const syllable of syllables) {
        if (!/^[a-z]+[1-6]$/.test(syllable)) errors.push(`${course.id}: ${item.hanzi} / ${syllable}`);
        if (/[ptk][245]$/.test(syllable)) errors.push(`${course.id}: checked tone ${syllable}`);
      }
    }
    expect(errors).toEqual([]);
  });
  it("does not always put the correct answer in the first position", () => {
    const positions = new Set(courses.flatMap(course => course.exercises.map(exercise => exercise.options.indexOf(exercise.answer))));
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
  it("keeps the cafe sample richer than a short expression list", () => {
    const sample = courses.find(course => course.id === "cafe-order")!;
    expect(sample.phrases.length).toBeGreaterThanOrEqual(18);
    expect(sample.dialogueLength).toBe(12);
    expect(sample.words.length).toBeGreaterThanOrEqual(14);
    expect(sample.patterns.length).toBeGreaterThanOrEqual(3);
  });
  it("reports de-duplicated content totals and diagnostic spelling alignment", () => {
    const mismatches = courses.flatMap(course => [...course.phrases, ...course.words].flatMap(item => {
      const hanziCount = [...item.hanzi].filter(character => /[\p{Script=Han}A-Za-z0-9]/u.test(character)).length;
      const syllableCount = item.jyutping.trim().split(/\s+/).length;
      return hanziCount === syllableCount ? [] : [`${course.id}: ${item.hanzi} (${hanziCount}) / ${item.jyutping} (${syllableCount})`];
    }));
    expect(mismatches).toEqual([]);
    expect(uniqueCoursePhrases).toBeGreaterThan(650);
    expect(uniqueCourseWords).toBeGreaterThan(400);
  });
});
