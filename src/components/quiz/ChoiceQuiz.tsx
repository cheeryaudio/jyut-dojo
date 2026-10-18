import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { useState } from "react";
import type { Sentence } from "../../types/domain";
import { AudioButton } from "../AudioButton";

interface ChoiceQuizProps {
  prompt: string;
  audioPath: string;
  options: Sentence[];
  answerId: string;
  onComplete: (correct: boolean) => void;
}

export function ChoiceQuiz({ prompt, audioPath, options, answerId, onComplete }: ChoiceQuizProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const correct = selectedId === answerId;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{prompt}</h2>
        <AudioButton path={audioPath} label="再聽一次" compact />
      </div>
      <div className="mt-6 grid gap-3">
        {options.map((option) => {
          const selected = option.id === selectedId;
          const answer = option.id === answerId;
          const stateClass = selectedId === null
            ? "border-stone-200 hover:border-ember dark:border-stone-700"
            : answer
              ? "border-sky-600 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
              : selected
                ? "border-rose-600 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/30"
                : "border-stone-200 opacity-55 dark:border-stone-700";
          return (
            <button
              type="button"
              key={option.id}
              disabled={selectedId !== null}
              onClick={() => setSelectedId(option.id)}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-lg font-bold transition active:scale-[0.99] dark:bg-stone-900 ${stateClass}`}
            >
              <span>{option.hanzi}</span>
              {selectedId !== null && answer && <CheckCircle className="shrink-0 text-sky-700 dark:text-sky-400" size={23} weight="fill" />}
              {selected && !answer && <XCircle className="shrink-0 text-rose-700 dark:text-rose-400" size={23} weight="fill" />}
            </button>
          );
        })}
      </div>
      {selectedId !== null && (
        <div className="mt-6">
          <p className={`font-bold ${correct ? "text-sky-700 dark:text-sky-400" : "text-rose-700 dark:text-rose-400"}`}>
            {correct ? "啱喇！" : "未啱，再聽清楚個節奏。"}
          </p>
          <button type="button" onClick={() => onComplete(correct)} className="mt-4 min-h-12 rounded-2xl bg-ember px-6 font-semibold text-white transition hover:bg-ember-dark active:scale-[0.98]">
            下一題
          </button>
        </div>
      )}
    </div>
  );
}
