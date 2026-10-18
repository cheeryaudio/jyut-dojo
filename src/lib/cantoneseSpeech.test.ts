import { describe, expect, it } from "vitest";
import { selectCantoneseVoice, type CantoneseVoiceCandidate } from "./cantoneseSpeech";

const voice = (name: string, lang: string, isDefault = false): CantoneseVoiceCandidate => ({
  default: isDefault,
  lang,
  name,
});

describe("selectCantoneseVoice", () => {
  it("prefers an exact Hong Kong Chinese voice", () => {
    const selected = selectCantoneseVoice([
      voice("Cantonese", "yue-Hant-HK"),
      voice("Sin-Ji", "zh-HK"),
    ]);
    expect(selected?.name).toBe("Sin-Ji");
  });

  it("accepts a yue locale when zh-HK is unavailable", () => {
    expect(selectCantoneseVoice([voice("Cantonese", "yue_Hant_HK")])?.lang).toBe("yue_Hant_HK");
  });

  it("does not silently select a Mandarin voice", () => {
    expect(selectCantoneseVoice([voice("普通話", "zh-CN")])).toBeNull();
  });
});
