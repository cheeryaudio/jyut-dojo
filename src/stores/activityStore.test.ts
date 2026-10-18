import { describe, expect, it } from "vitest";
import { calculateStreak } from "./activityStore";
describe("learning streak calendar", () => {
  const today = new Date(2026, 9, 18, 12);
  it("retains a run through yesterday before today's first practice", () => {
    expect(calculateStreak(["2026-10-15", "2026-10-16", "2026-10-17"], today)).toBe(3);
  });
  it("includes today and stops at a missing calendar day", () => {
    expect(calculateStreak(["2026-10-14", "2026-10-16", "2026-10-17", "2026-10-18"], today)).toBe(3);
  });
  it("shows zero when neither today nor yesterday contains practice", () => {
    expect(calculateStreak(["2026-10-16"], today)).toBe(0);
  });
});
