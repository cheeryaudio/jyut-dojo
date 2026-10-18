import { X } from "@phosphor-icons/react";
import { useEffect } from "react";
import type { Word } from "../types/domain";
import { AudioButton } from "./AudioButton";

interface WordSheetProps {
  word: Word;
  onClose: () => void;
}

export function WordSheet({ word, onClose }: WordSheetProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-950/40 p-3 backdrop-blur-sm md:items-center" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${word.hanzi} 詞語提示`}
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-paper p-6 shadow-warm dark:border-stone-700 dark:bg-stone-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-6xl font-semibold tracking-tight">{word.hanzi}</div>
            <div className="mt-3 font-jyutping text-lg font-bold text-ember-dark dark:text-sky-300">{word.jyutping}</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800" aria-label="關閉詞語提示">
            <X size={20} weight="bold" />
          </button>
        </div>
        <p className="mt-6 text-lg text-stone-700 dark:text-stone-200">{word.mandarin}</p>
        <div className="mt-6">
          <AudioButton path={word.audio} label="聽呢個詞" />
        </div>
      </section>
    </div>
  );
}
