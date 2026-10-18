import { CheckCircle, HandGrabbing, XCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { wordById } from "../../data";
import type { Sentence } from "../../types/domain";
import { AudioButton } from "../AudioButton";

interface ReorderQuizProps {
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
}

interface ReorderToken {
  key: string;
  label: string;
}

export function ReorderQuiz({ sentence, onComplete }: ReorderQuizProps) {
  const orderedTokens = useMemo<ReorderToken[]>(
    () => sentence.words.map((wordId, index) => ({ key: `${wordId}-${index}`, label: wordById.get(wordId)?.jyutping ?? wordId })),
    [sentence],
  );
  const initialPool = useMemo(() => [...orderedTokens].reverse(), [orderedTokens]);
  const [pool, setPool] = useState<ReorderToken[]>(initialPool);
  const [answer, setAnswer] = useState<ReorderToken[]>([]);
  const [result, setResult] = useState<boolean | null>(null);

  const moveToAnswer = (key: string) => {
    if (result !== null) return;
    const token = pool.find((item) => item.key === key);
    if (token === undefined) return;
    setPool((items) => items.filter((item) => item.key !== key));
    setAnswer((items) => [...items, token]);
  };

  const moveToPool = (key: string) => {
    if (result !== null) return;
    const token = answer.find((item) => item.key === key);
    if (token === undefined) return;
    setAnswer((items) => items.filter((item) => item.key !== key));
    setPool((items) => [...items, token]);
  };

  const check = () => {
    const isCorrect = answer.length === orderedTokens.length && answer.every((token, index) => token.key === orderedTokens[index]?.key);
    setResult(isCorrect);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">砌返啱嘅粵拼次序</h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-300">拖入答案區，手機亦可以順序撳選。</p>
        </div>
        <AudioButton path={sentence.audio} label="聽提示" compact />
      </div>

      <div
        className="mt-6 min-h-28 rounded-2xl border-2 border-dashed border-ember/50 bg-sky-50 p-3 dark:bg-sky-950/20"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          moveToAnswer(event.dataTransfer.getData("text/plain"));
        }}
        aria-label="答案區"
      >
        {answer.length === 0 ? (
          <div className="flex min-h-20 items-center justify-center gap-2 text-sm font-bold text-stone-500 dark:text-stone-300"><HandGrabbing size={20} />拖粵拼入嚟</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {answer.map((token) => (
              <button key={token.key} type="button" onClick={() => moveToPool(token.key)} draggable={result === null} onDragStart={(event) => event.dataTransfer.setData("text/plain", token.key)} className="rounded-2xl bg-ember px-3 py-2 font-jyutping text-sm font-bold text-white active:scale-[0.98]">
                {token.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="mt-4 flex min-h-20 flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          moveToPool(event.dataTransfer.getData("text/plain"));
        }}
        aria-label="待選粵拼"
      >
        {pool.map((token) => (
          <button key={token.key} type="button" onClick={() => moveToAnswer(token.key)} draggable={result === null} onDragStart={(event) => event.dataTransfer.setData("text/plain", token.key)} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 font-jyutping text-sm font-bold transition hover:border-ember active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800">
            {token.label}
          </button>
        ))}
      </div>

      {result === null ? (
        <button type="button" onClick={check} disabled={answer.length !== orderedTokens.length} className="mt-6 min-h-12 rounded-2xl bg-ember px-6 font-semibold text-white transition enabled:hover:bg-ember-dark enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
          對答案
        </button>
      ) : (
        <div className="mt-6">
          <p className={`flex items-center gap-2 font-bold ${result ? "text-sky-700 dark:text-sky-400" : "text-rose-700 dark:text-rose-400"}`}>
            {result ? <CheckCircle size={22} weight="fill" /> : <XCircle size={22} weight="fill" />}
            {result ? "次序啱晒！" : `正確次序：${orderedTokens.map((token) => token.label).join(" ")}`}
          </p>
          <button type="button" onClick={() => onComplete(result)} className="mt-4 min-h-12 rounded-2xl bg-ember px-6 font-semibold text-white active:scale-[0.98]">
            下一題
          </button>
        </div>
      )}
    </div>
  );
}
