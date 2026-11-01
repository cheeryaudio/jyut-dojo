import { ArrowRight, Microphone, Play, Stop, Users } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { selectCantoneseVoice } from "../lib/cantoneseSpeech";
import { resolvePhraseAudio } from "../lib/interactiveExercises";
import type { CoursePhrase } from "../types/course";

export type RoleplayMode = "off" | "speaker-0" | "speaker-1";

interface DialoguePlayerBarProps {
  lines: CoursePhrase[];
  speakers: [string, string];
  activeIndex: number | null;
  roleplay: RoleplayMode;
  waitingForUser: boolean;
  onActiveChange: (index: number | null) => void;
  onRoleplayChange: (mode: RoleplayMode) => void;
  onWaitingChange: (waiting: boolean) => void;
}

function waitForCantoneseVoice(timeoutMs = 600): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve(null);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    return Promise.resolve(selectCantoneseVoice(existing));
  }
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(selectCantoneseVoice(window.speechSynthesis.getVoices()));
    };
    const onVoicesChanged = () => finish();
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    window.setTimeout(finish, timeoutMs);
  });
}

export function DialoguePlayerBar({
  lines,
  speakers,
  activeIndex,
  roleplay,
  waitingForUser,
  onActiveChange,
  onRoleplayChange,
  onWaitingChange,
}: DialoguePlayerBarProps) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const internalAudioDispatchRef = useRef(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const roleplayRef = useRef<RoleplayMode>(roleplay);
  roleplayRef.current = roleplay;

  const clearCurrentMedia = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    onWaitingChange(false);
    onActiveChange(null);
    clearCurrentMedia();
  }, [clearCurrentMedia, onActiveChange, onWaitingChange]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
    const refresh = () => {
      cachedVoiceRef.current = selectCantoneseVoice(window.speechSynthesis.getVoices());
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  useEffect(() => {
    const onExternalAudio = () => {
      if (internalAudioDispatchRef.current) return;
      if (playingRef.current) stopAll();
    };
    window.addEventListener("dojo:audio-start", onExternalAudio);
    return () => {
      window.removeEventListener("dojo:audio-start", onExternalAudio);
      stopAll();
    };
  }, [stopAll]);

  const dispatchInternalAudioStart = () => {
    internalAudioDispatchRef.current = true;
    window.dispatchEvent(new Event("dojo:audio-start"));
    internalAudioDispatchRef.current = false;
  };

  const playStep = useCallback(async (index: number) => {
    if (!playingRef.current || index >= lines.length) {
      stopAll();
      return;
    }
    clearCurrentMedia();
    dispatchInternalAudioStart();

    const line = lines[index]!;
    onActiveChange(index);
    const el = document.getElementById(line.id);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const isUserTurn =
      (roleplayRef.current === "speaker-0" && index % 2 === 0) ||
      (roleplayRef.current === "speaker-1" && index % 2 === 1);

    if (isUserTurn) {
      onWaitingChange(true);
      return;
    }

    onWaitingChange(false);
    const scheduleNext = () => {
      if (!playingRef.current) return;
      timerRef.current = window.setTimeout(() => {
        void playStep(index + 1);
      }, 420);
    };

    const staticUrl = resolvePhraseAudio(line);
    if (staticUrl) {
      const player = new Audio(staticUrl);
      audioRef.current = player;
      player.onended = scheduleNext;
      player.onerror = () => {
        if (!playingRef.current) return;
        setError("对话音频播放失败，请检查设备音量。");
        stopAll();
      };
      void player.play().catch(() => {
        if (!playingRef.current) return;
        setError("浏览器阻止了自动播放，请再按一次。");
        stopAll();
      });
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("当前设备不支持语音合成，请直接阅读粤拼。");
      stopAll();
      return;
    }

    const voice = cachedVoiceRef.current ?? (await waitForCantoneseVoice());
    if (!playingRef.current) return;
    cachedVoiceRef.current = voice;
    if (!voice) {
      setError("未检测到“广东话（香港）”语音包，请在系统中安装广东话语音后再试连播。");
      stopAll();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(line.hanzi.replace(/[……]/g, ""));
    utteranceRef.current = utterance;
    utterance.lang = "zh-HK";
    utterance.voice = voice;
    utterance.rate = 0.84;
    utterance.onend = () => {
      utteranceRef.current = null;
      scheduleNext();
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      utteranceRef.current = null;
      if (!playingRef.current || event.error === "canceled" || event.error === "interrupted") {
        return;
      }
      setError("语音播放中断，请重试。");
      stopAll();
    };
    window.speechSynthesis.speak(utterance);
  }, [clearCurrentMedia, lines, onActiveChange, onWaitingChange, stopAll]);

  const startPlayback = () => {
    setError("");
    dispatchInternalAudioStart();
    playingRef.current = true;
    setPlaying(true);
    void playStep(0);
  };

  const continueAfterUserTurn = () => {
    if (!playingRef.current || activeIndex === null) return;
    onWaitingChange(false);
    void playStep(activeIndex + 1);
  };

  return (
    <div className="dialogue-player-bar" role="region" aria-label="对话连播与分角色对练">
      <div className="dialogue-player-actions">
        {!playing ? (
          <button type="button" className="button-primary dialogue-play-btn" onClick={startPlayback}>
            <Play size={16} weight="fill" /> {roleplay === "off" ? "连播整段对话" : "开始分角色对练"}
          </button>
        ) : (
          <button type="button" className="button-outline dialogue-stop-btn" onClick={stopAll}>
            <Stop size={16} weight="fill" /> 停止播放 ({(activeIndex ?? 0) + 1}/{lines.length})
          </button>
        )}

        <div className="dialogue-roleplay-switch" role="group" aria-label="分角色模式">
          <span className="roleplay-label"><Users size={16} /> 角色对练：</span>
          <button
            type="button"
            aria-pressed={roleplay === "off"}
            onClick={() => { onRoleplayChange("off"); if (playing) stopAll(); }}
          >
            关
          </button>
          <button
            type="button"
            aria-pressed={roleplay === "speaker-0"}
            onClick={() => { onRoleplayChange("speaker-0"); if (playing) stopAll(); }}
          >
            我演{speakers[0]}
          </button>
          <button
            type="button"
            aria-pressed={roleplay === "speaker-1"}
            onClick={() => { onRoleplayChange("speaker-1"); if (playing) stopAll(); }}
          >
            我演{speakers[1]}
          </button>
        </div>
      </div>

      {playing && waitingForUser && activeIndex !== null && (
        <div className="dialogue-user-turn" role="status" aria-live="polite">
          <div>
            <strong><Microphone size={16} weight="fill" /> 轮到你扮演「{speakers[activeIndex % 2]}」开口说：</strong>
            <span>请大声读出下方高亮台词，读完后点击继续。</span>
          </div>
          <button type="button" className="button-primary" onClick={continueAfterUserTurn}>
            我读好了，下一句 <ArrowRight size={15} />
          </button>
        </div>
      )}

      {error && <p className="dialogue-player-error" role="status">{error}</p>}
    </div>
  );
}
