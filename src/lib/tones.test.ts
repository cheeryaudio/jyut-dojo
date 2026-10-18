import { describe, expect, it } from "vitest";
import { advanceDrillProgress, createDrillQuestion, pairKey, type DrillProgressState, type TonePair } from "./tones";
import { toneItems } from "../data";

describe("adaptive tone drill", () => {
  it("levels up after five correct answers", () => {
    const pair: TonePair = [1, 4];
    let state: DrillProgressState = { level: 1, streak: 0, reinforcement: [] };
    for (let index = 0; index < 5; index += 1) state = advanceDrillProgress(state, pair, true);
    expect(state.level).toBe(2);
    expect(state.streak).toBe(0);
  });

  it("resets the streak and queues a wrong pair", () => {
    const pair: TonePair = [2, 5];
    const state = advanceDrillProgress({ level: 3, streak: 4, reinforcement: [] }, pair, false);
    expect(state.streak).toBe(0);
    expect(state.reinforcement.map(pairKey)).toEqual(["2v5"]);
  });

  it("serves the reinforcement queue before a random level pair", () => {
    const reinforced: TonePair = [3, 6];
    const result = createDrillQuestion(1, [reinforced], toneItems, () => 0);
    expect(pairKey(result.question.pair)).toBe("3v6");
    expect(result.remainingReinforcement).toEqual([]);
  });
});
