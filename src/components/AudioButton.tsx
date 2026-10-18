import { SpeakerHigh, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { playStaticAudio } from "../lib/audio/player";

interface AudioButtonProps {
  path: string;
  label: string;
  compact?: boolean;
}

export function AudioButton({ path, label, compact = false }: AudioButtonProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const play = async () => {
    setError(false);
    setLoading(true);
    try {
      await playStaticAudio(path);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void play();
      }}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white font-bold text-ink transition hover:border-ember hover:text-ember-dark active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 ${compact ? "h-10 w-10" : "min-h-12 px-4"}`}
      aria-label={label}
    >
      {error ? <WarningCircle size={21} weight="bold" /> : <SpeakerHigh size={21} weight={loading ? "regular" : "fill"} />}
      {!compact && <span>{error ? "音訊未就緒" : label}</span>}
    </button>
  );
}
