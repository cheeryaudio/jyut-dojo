export type CantoneseVoiceCandidate = Pick<SpeechSynthesisVoice, "default" | "lang" | "name">;

const normalize = (value: string) => value.trim().toLowerCase().replaceAll("_", "-");

export function selectCantoneseVoice<T extends CantoneseVoiceCandidate>(voices: readonly T[]): T | null {
  const exactHongKong = voices.find((voice) => normalize(voice.lang) === "zh-hk");
  if (exactHongKong) return exactHongKong;

  const yueVoice = voices.find((voice) => normalize(voice.lang).startsWith("yue"));
  if (yueVoice) return yueVoice;

  return (
    voices.find((voice) => /cantonese|廣東話|廣東語|粵語|粤语/i.test(voice.name)) ??
    null
  );
}
