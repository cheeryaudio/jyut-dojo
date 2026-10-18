import { BookOpenText, CheckCircle, GearSix, SpeakerHigh } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { wordById } from "../data";
import { playStaticAudio } from "../lib/audio/player";
import { useLearningStore } from "../stores/learningStore";
import { useReviewStore } from "../stores/reviewStore";
import type { ReviewMode, ReviewRating } from "../types/domain";

const modeOptions: Array<{ value: ReviewMode; label: string }> = [
  { value: "audio", label: "淨聽聲" },
  { value: "hanzi", label: "淨睇字" },
  { value: "jyutping", label: "淨睇粵拼" },
];

const ratingOptions: Array<{ value: ReviewRating; label: string; hint: string; className: string }> = [
  { value: "again", label: "再嚟", hint: "唔記得", className: "border-red-500 text-red-800 dark:text-red-200" },
  { value: "hard", label: "有啲難", hint: "勉強記得", className: "border-amber-500 text-amber-800 dark:text-amber-200" },
  { value: "good", label: "記得", hint: "正常回想", className: "border-sky-600 text-sky-800 dark:text-sky-200" },
  { value: "easy", label: "好易", hint: "即刻識", className: "border-blue-500 text-blue-800 dark:text-blue-200" },
];

export function LegacyWordReview() {
  const scenarioProgress = useLearningStore((state) => state.scenarioProgress);
  const learningHydrated = useLearningStore((state) => state.hydrated);
  const hydrateLearning = useLearningStore((state) => state.hydrate);
  const { cards, mode, hydrated, hydrate, syncCompletedLessons, grade, setMode } = useReviewStore();
  const [revealed, setRevealed] = useState(false);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    if (!learningHydrated) void hydrateLearning();
    if (!hydrated) void hydrate();
  }, [hydrate, hydrateLearning, hydrated, learningHydrated]);

  useEffect(() => {
    if (learningHydrated && hydrated) void syncCompletedLessons(scenarioProgress);
  }, [hydrated, learningHydrated, scenarioProgress, syncCompletedLessons]);

  const dueCards = useMemo(() => cards
    .filter((card) => new Date(card.due).getTime() <= Date.now())
    .sort((a, b) => a.due.localeCompare(b.due)), [cards]);
  const currentCard = dueCards[0];
  const currentWord = currentCard === undefined ? undefined : wordById.get(currentCard.wordId);

  const play = async () => {
    if (currentWord === undefined) return;
    setAudioError(false);
    try {
      await playStaticAudio(currentWord.audio);
    } catch {
      setAudioError(true);
    }
  };

  const rate = async (rating: ReviewRating) => {
    if (currentCard === undefined) return;
    await grade(currentCard.wordId, rating);
    setRevealed(false);
    setAudioError(false);
  };

  if (!hydrated || !learningHydrated) {
    return (
      <section className="py-10" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="mt-8 h-80 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12">
      <header className="max-w-2xl">
        <p className="font-jyutping text-sm font-bold text-ember-dark dark:text-sky-300">FSRS review</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">情境词卡</h2>

      </header>

      <div className="mt-7 flex flex-wrap items-center gap-2" aria-label="卡面設定">
        <GearSix size={20} weight="bold" className="mr-1 text-stone-500" aria-hidden="true" />
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => void setMode(option.value)}
            aria-pressed={mode === option.value}
            className={`min-h-11 rounded-2xl border px-4 text-sm font-bold transition active:scale-[0.98] ${mode === option.value ? "border-ember bg-sky-50 text-ember-dark dark:bg-sky-950 dark:text-sky-200" : "border-stone-300 dark:border-stone-700"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {currentCard !== undefined && currentWord !== undefined ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_18rem]">
          <article className="flex min-h-[26rem] flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-warm dark:border-stone-800 dark:bg-stone-900 sm:p-9">
            <div className="flex items-center justify-between text-sm font-bold text-stone-500 dark:text-stone-400">
              <span>仲有 {dueCards.length} 張</span>
              <span className="font-jyutping">reps {currentCard.reps}</span>
            </div>

            {!revealed ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                {mode === "audio" && (
                  <button type="button" onClick={() => void play()} className="flex h-24 w-24 items-center justify-center rounded-2xl bg-ember text-white transition hover:bg-ember-dark active:scale-[0.98]" aria-label="播放卡片音訊">
                    <SpeakerHigh size={42} weight="fill" />
                  </button>
                )}
                {mode === "hanzi" && <p className="text-7xl font-semibold tracking-tight sm:text-8xl">{currentWord.hanzi}</p>}
                {mode === "jyutping" && <p className="font-jyutping text-4xl font-semibold text-ember-dark dark:text-sky-300 sm:text-5xl">{currentWord.jyutping}</p>}
                <button type="button" onClick={() => setRevealed(true)} className="mt-10 min-h-12 rounded-2xl border border-stone-300 px-6 font-semibold transition hover:border-ember active:scale-[0.98] dark:border-stone-700">揭開答案</button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center" aria-live="polite">
                <p className="text-7xl font-semibold tracking-tight sm:text-8xl">{currentWord.hanzi}</p>
                <p className="mt-5 font-jyutping text-2xl font-semibold text-ember-dark dark:text-sky-300">{currentWord.jyutping}</p>
                <p className="mt-3 text-lg text-stone-600 dark:text-stone-300">{currentWord.mandarin}</p>
                <button type="button" onClick={() => void play()} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-ember px-5 font-bold text-white transition hover:bg-ember-dark active:scale-[0.98]"><SpeakerHigh size={20} weight="fill" /> 播多次</button>
              </div>
            )}
            {audioError && <p className="text-center text-sm font-bold text-red-700 dark:text-red-300">音訊載入失敗，請再試一次。</p>}
          </article>

          <aside className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-semibold">記成點？</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">睇完答案先評。FSRS 會按呢次回想更新下次日期。</p>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-1">
              {ratingOptions.map((option) => (
                <button key={option.value} type="button" disabled={!revealed} onClick={() => void rate(option.value)} className={`min-h-14 rounded-2xl border-2 px-4 text-left transition disabled:cursor-not-allowed disabled:opacity-35 active:scale-[0.98] ${option.className}`}>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs opacity-75">{option.hint}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-10 max-w-2xl rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          {cards.length === 0 ? (
            <>
              <BookOpenText size={42} weight="regular" className="text-stone-400" />
              <h2 className="mt-5 text-2xl font-semibold">做完一課先有卡</h2>
              <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">完成任何情境嘅課後三式，嗰課生字就會自動入隊。</p>
              <Link to="/path" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-ember px-5 font-semibold text-white active:scale-[0.98]">选择情境课程</Link>
            </>
          ) : (
            <>
              <CheckCircle size={44} weight="fill" className="text-sky-600" />
              <h2 className="mt-5 text-2xl font-semibold">今日清晒</h2>
              <p className="mt-3 text-stone-600 dark:text-stone-300">而家冇到期卡。聽日返嚟再溫。</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
