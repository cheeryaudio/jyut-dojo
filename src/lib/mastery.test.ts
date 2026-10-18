import { describe, expect, it } from "vitest";
import { calculateCapabilitySummaries, calculateUnitMastery, nextLessonStepIndex, weakestCapability } from "./mastery";
import type { LearningEvent } from "../types/learning";

const event = (stepId: LearningEvent["stepId"], score: number, capabilityIds = ["listening"]): LearningEvent => ({ id: stepId, unitId: "repair", capabilityIds, stepId, kind: "controlled", score, createdAt: `2026-07-0${score % 9 + 1}T00:00:00.000Z` });

describe("mastery evidence", () => {
  it("aggregates completed lesson steps", () => {
    const result = calculateUnitMastery([event("diagnose", 40), event("practice", 90)], "repair");
    expect(result.completedSteps).toEqual(expect.arrayContaining(["diagnose", "practice"]));
    expect(result.score).toBeGreaterThan(60);
  });

  it("marks a unit complete only after all seven steps", () => {
    const steps: LearningEvent["stepId"][] = ["diagnose", "input", "breakdown", "practice", "output", "transfer", "delayed"];
    expect(calculateUnitMastery(steps.map((step) => event(step, 80)), "repair").completedAt).toBeDefined();
  });

  it("finds the weakest evidenced capability", () => {
    const events = [event("practice", 40, ["tone"]), event("output", 85, ["speaking"])];
    expect(weakestCapability(events)?.capabilityId).toBe("tone");
    expect(calculateCapabilitySummaries(events)).toHaveLength(2);
  });

  it("advances exactly one lesson step", () => {
    expect(nextLessonStepIndex("diagnose")).toBe(1);
    expect(nextLessonStepIndex("input")).toBe(2);
    expect(nextLessonStepIndex("delayed")).toBe(6);
  });
});
