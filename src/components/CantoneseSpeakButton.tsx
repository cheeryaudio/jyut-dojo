import { SpeakerHigh } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { selectCantoneseVoice } from "../lib/cantoneseSpeech";

export function CantoneseSpeakButton({ text, label = "聽示範", audio }: { text: string; label?: string; audio?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const stop = () => {
      playerRef.current?.pause();
      playerRef.current = null;
      if (utteranceRef.current && "speechSynthesis" in window) window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
    };
    window.addEventListener("dojo:audio-start", stop);
    return () => { window.removeEventListener("dojo:audio-start", stop); stop(); };
  }, []);

  useEffect(() => {
    const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(canSpeak);
    if (!canSpeak) return undefined;

    const refreshVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setVoice(selectCantoneseVoice(voices));
      if (voices.length > 0) setVoicesLoaded(true);
    };
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
  }, []);

  const speak = () => {
    setAttempted(true);
    setError("");
    window.dispatchEvent(new Event("dojo:audio-start"));
    if (audio !== undefined) {
      setSpeaking(true);
      const player = new Audio(audio);
      playerRef.current = player;
      player.onended = () => setSpeaking(false);
      player.onerror = () => {
        setSpeaking(false);
        setError("示範音訊播放唔到，請檢查裝置音量再試。");
      };
      void player.play().catch(() => {
        setSpeaking(false);
        setError("瀏覽器阻止咗播放，請再撳一次。");
      });
      return;
    }
    if (!supported) return;
    window.speechSynthesis.cancel();
    const selectedVoice = voice ?? selectCantoneseVoice(window.speechSynthesis.getVoices());
    if (!selectedVoice) {
      setError("未找到粤语语音。请在设备中安装“广东话（香港）”语音；你仍可阅读粤拼和释义。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[……]/g, ""));
    utteranceRef.current = utterance;
    utterance.lang = "zh-HK";
    utterance.voice = selectedVoice;
    utterance.rate = 0.82;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError("裝置暫時讀唔到呢句，請安裝「廣東話（香港）」語音後再試。");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const showVoiceWarning = attempted && !error && audio === undefined && supported && voicesLoaded && !voice;

  return (
    <span className="inline-flex max-w-sm flex-col items-start gap-1.5">
      <button type="button" aria-label={`${speaking ? "播放中" : label}：${text}`} disabled={(audio === undefined && !supported) || speaking} onClick={speak} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 text-sm font-black transition hover:border-ember disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] dark:border-stone-700">
        <SpeakerHigh size={19} weight="fill" /> {speaking ? "播放中" : label}
      </button>
      {audio === undefined && !supported ? (
        <span className="text-xs font-bold text-red-700 dark:text-red-300">呢部裝置唔支援語音播放。</span>
      ) : null}
      {showVoiceWarning ? (
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
          请安装“广东话（香港）”语音后再播放新课示范。
        </span>
      ) : null}
      {error ? <span aria-live="polite" className="text-xs font-bold text-red-700 dark:text-red-300">{error}</span> : null}
    </span>
  );
}
