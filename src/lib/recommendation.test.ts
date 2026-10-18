import { describe, expect, it } from "vitest";
import { buildDailyPlan } from "./recommendation";
import type { LearnerProfile } from "../types/curriculum";
import type { ScenarioProgressMap } from "../types/progress";

const profile = (goal: LearnerProfile["goal"], dailyMinutes: LearnerProfile["dailyMinutes"]): LearnerProfile => ({
  goal,
  dailyMinutes,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("daily learning recommendation", () => {
  it("puts due review before new learning", () => {
    const plan = buildDailyPlan({ profile: profile("daily", 10), scenarioProgress: {}, dueReviews: 12, toneAnswers: 0 });
    expect(plan[0]?.kind).toBe("review");
    expect(plan[0]?.reason).toContain("12 張卡");
  });

  it("prioritizes phone practice early for a work goal", () => {
    const progress: ScenarioProgressMap = {
      greetings: { scenarioId: "greetings", bestStars: 2, attempts: 1, lastScore: 2, completedAt: "2026-01-02T00:00:00.000Z" },
    };
    const plan = buildDailyPlan({ profile: profile("work", 20), scenarioProgress: progress, dueReviews: 0, toneAnswers: 30 });
    expect(plan.find((task) => task.kind === "lesson")?.route).toBe("/learn/phone");
  });

  it("adds an output task when the learner reserves twenty minutes", () => {
    const plan = buildDailyPlan({ profile: profile("integration", 20), scenarioProgress: {}, dueReviews: 0, toneAnswers: 0 });
    expect(plan.some((task) => task.kind === "speaking")).toBe(true);
  });

  it("never schedules beyond the selected daily time", () => {
    const plan = buildDailyPlan({ profile: profile("integration", 20), scenarioProgress: {}, dueReviews: 0, toneAnswers: 0 });
    expect(plan.reduce((sum, task) => sum + task.minutes, 0)).toBeLessThanOrEqual(20);
  });
});
