import { describe, expect, it } from "vitest";
import { createReviewCard, retrievability, scheduleReview } from "./fsrs";

describe("FSRS scheduling", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");

  it("initializes a new card and schedules a good recall in the future", () => {
    const card = scheduleReview(createReviewCard("nei5", start), "good", start);
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.stability).toBeGreaterThan(2);
    expect(new Date(card.due).getTime()).toBeGreaterThan(start.getTime());
  });

  it("schedules easy later than hard for the same new card", () => {
    const source = createReviewCard("hou2", start);
    const hard = scheduleReview(source, "hard", start);
    const easy = scheduleReview(source, "easy", start);
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(hard.due).getTime());
    expect(easy.difficulty).toBeLessThan(hard.difficulty);
  });

  it("counts a lapse and returns an again card in ten minutes", () => {
    const reviewed = scheduleReview(createReviewCard("m4", start), "good", start);
    const now = new Date("2026-01-04T00:00:00.000Z");
    const failed = scheduleReview(reviewed, "again", now);
    expect(failed.lapses).toBe(1);
    expect(new Date(failed.due).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it("defines stability as the interval where recall is about ninety percent", () => {
    expect(retrievability(5, 5)).toBeCloseTo(0.9, 5);
  });
});
