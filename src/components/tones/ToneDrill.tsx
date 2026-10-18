import { ArrowRight, SpeakerHigh } from "@phosphor-icons/react";
import { useState } from "react";
import { toneItems } from "../../data";
import { playStaticAudio } from "../../lib/audio/player";
import { advanceDrillProgress, createDrillQuestion, pairKey, TONE_DEFINITIONS, type DrillQuestion, type TonePair } from "../../lib/tones";
import { useToneStore } from "../../stores/toneStore";
import type { ToneNumber } from "../../types/tone";

interface DrillSession {
  question: DrillQuestion;
  reinforcement: TonePair[];
}

const makeSession = (level: number, reinforcement: TonePair[]): DrillSession => {
  const selection = createDrillQuestion(level, reinforcement, toneItems);
  return { question: selection.question, reinforcement: selection.remainingReinforcement };
};

const levelLabel: Record<number, string> = {
  1: "拉開距離",
  2: "開始混合",
  3: "最易混淆",
};

export function ToneDrill() {
  const savedLevel = useToneStore((state) => state.progress.bestLevel);
  const recordAnswer = useToneStore((state) => state.recordAnswer);
  const initialLevel = Math.min(3, Math.max(1, savedLevel));
  const [level, setLevel] = useState(initialLevel);
  const [streak, setStreak] = useState(0);
  const [session, setSession] = useState<DrillSession>(() => makeSession(initialLevel, []));
  const [answer, setAnswer] = useState<ToneNumber | null>(null);
  const [audioError, setAudioError] = useState(false);

  const playQuestion = async () => {
    setAudioError(false);
    try {
      await playStaticAudio(session.question.item.audio);
    } catch {
      setAudioError(true);
    }
  };

  const choose = (choice: ToneNumber) => {
    if (answer !== null) return;
    const correct = choice === session.question.item.tone;
    setAnswer(choice);
    const nextProgress = advanceDrillProgress({ level, streak, reinforcement: session.reinforcement }, session.question.pair, correct);
    setLevel(nextProgress.level);
    setStreak(nextProgress.streak);
    setSession((current) => ({ ...current, reinforcement: nextProgress.reinforcement }));
    void recordAnswer(session.question.item.tone as ToneNumber, session.question.pair, correct, level);
  };

  const next = () => {
    setSession((current) => makeSession(level, current.reinforcement));
    setAnswer(null);
    setAudioError(false);
  };

  const isCorrect = answer === session.question.item.tone;

  return (
    <section aria-labelledby="tone-drill-title" className="mx-auto max-w-3xl">
      <div className="max-w-2xl">
        <h2 id="tone-drill-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">聽一聲，揀一調</h2>
        <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">連續答啱五題就升級。答錯嘅組合會排入強化隊列，好快再見。</p>
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-warm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5 dark:border-stone-700">
          <div>
            <p className="text-sm font-bold text-ember-dark dark:text-sky-300">難度 {level}：{levelLabel[level]}</p>
            <p className="mt-1 font-jyutping text-xs text-stone-500 dark:text-stone-400">pair {pairKey(session.question.pair)}　連續答啱 {streak} / 5</p>
          </div>
          <button type="button" onClick={() => void playQuestion()} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-ember px-5 font-bold text-white transition hover:bg-ember-dark active:scale-[0.98]">
            <SpeakerHigh size={21} weight="fill" />
            播放題目
          </button>
        </div>

        <p className="mt-7 text-center text-sm font-bold text-stone-500 dark:text-stone-400">你聽到第幾聲？</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {session.question.choices.map((choice) => {
            const definition = TONE_DEFINITIONS.find((candidate) => candidate.tone === choice);
            if (definition === undefined) return null;
            const selected = answer === choice;
            const correctChoice = answer !== null && choice === session.question.item.tone;
            const stateClass = correctChoice
              ? "border-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
              : selected
                ? "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
                : "border-stone-200 bg-paper hover:border-ember dark:border-stone-700 dark:bg-stone-950";
            return (
              <button
                key={choice}
                type="button"
                disabled={answer !== null}
                onClick={() => choose(choice)}
                className={`min-h-28 rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] disabled:cursor-default ${stateClass}`}
              >
                <span className="text-3xl font-semibold">第 {choice} 聲</span>
                <span className="mt-2 block font-jyutping text-sm" style={{ color: definition.color }}>{definition.name} {definition.contour}</span>
              </button>
            );
          })}
        </div>

        {audioError && <p className="mt-4 text-sm font-bold text-red-700 dark:text-red-300">題目音訊載入失敗，請再試一次。</p>}

        <div className="mt-6 min-h-20" aria-live="polite">
          {answer !== null && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-stone-100 p-4 dark:bg-stone-800">
              <div>
                <p className="font-semibold">{isCorrect ? "啱喇！" : `呢題係第 ${session.question.item.tone} 聲。`}</p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{session.question.item.hanzi}　<span className="font-jyutping">{session.question.item.jyutping}</span>　{session.question.item.mandarin}</p>
              </div>
              <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-stone-300 px-4 font-bold transition hover:border-ember active:scale-[0.98] dark:border-stone-600">
                下一題 <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
