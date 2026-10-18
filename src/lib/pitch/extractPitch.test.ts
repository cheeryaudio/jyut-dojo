import { describe, expect, it } from "vitest";
import { postProcessPitchFrames } from "./extractPitch";

describe("pitch post-processing", () => {
  it("normalizes time and a rising contour", () => {
    const track = postProcessPitchFrames([
      { time: 0.1, hz: 100 },
      { time: 0.2, hz: 110 },
      { time: 0.3, hz: 120 },
      { time: 0.4, hz: 130 },
      { time: 0.5, hz: 140 },
    ]);
    expect(track.points[0]?.time).toBe(0);
    expect(track.points.at(-1)?.time).toBe(1);
    expect(track.points.at(-1)?.value).toBeGreaterThan(track.points[0]?.value ?? 1);
  });

  it("flattens a stable pitch to the visual midpoint", () => {
    const track = postProcessPitchFrames([
      { time: 0, hz: 180 },
      { time: 0.1, hz: 180 },
      { time: 0.2, hz: 180 },
      { time: 0.3, hz: 180 },
    ]);
    expect(track.points.every((point) => point.value === 0.5)).toBe(true);
  });

  it("rejects tracks with too few voiced frames", () => {
    expect(() => postProcessPitchFrames([{ time: 0, hz: 120 }])).toThrow();
  });
});
