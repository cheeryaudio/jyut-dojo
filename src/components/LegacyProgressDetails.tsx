import { Books, Fire, Star, Waveform } from "@phosphor-icons/react";
import { useEffect, useMemo } from "react";
import { scenarios, sentenceById } from "../data";
import { TONE_DEFINITIONS } from "../lib/tones";
import { calculateStreak, useActivityStore } from "../stores/activityStore";
import { useLearningStore } from "../stores/learningStore";
import { useToneStore } from "../stores/toneStore";
import { useMasteryStore } from "../stores/masteryStore";
import { calculateCapabilitySummaries, calculateUnitMastery } from "../lib/mastery";
import { deepLessons } from "../data/deepLessons";
import { capabilityCatalog } from "../data/capabilities";


const accuracy = (correct = 0, total = 0): number => total === 0 ? 0 : Math.round(correct / total * 100);

export function LegacyProgressDetails() {
  const { dates, hydrated: activityHydrated, hydrate: hydrateActivity } = useActivityStore();
  const { scenarioProgress, hydrated: learningHydrated, hydrate: hydrateLearning } = useLearningStore();
  const { progress: toneProgress, hydrated: toneHydrated, hydrate: hydrateTone } = useToneStore();
  const { events, hydrated: masteryHydrated, hydrate: hydrateMastery } = useMasteryStore();

  useEffect(() => {
    if (!activityHydrated) void hydrateActivity();
    if (!learningHydrated) void hydrateLearning();
    if (!toneHydrated) void hydrateTone();
    if (!masteryHydrated) void hydrateMastery();
  }, [activityHydrated, hydrateActivity, hydrateLearning, hydrateMastery, hydrateTone, learningHydrated, masteryHydrated, toneHydrated]);

  const learnedWords = useMemo(() => {
    const ids = new Set<string>();
    scenarios.forEach((scenario) => {
      if (scenarioProgress[scenario.id] === undefined) return;
      scenario.sentences.forEach((sentenceId) => sentenceById.get(sentenceId)?.words.forEach((wordId) => ids.add(wordId)));
    });
    return ids.size;
  }, [scenarioProgress]);

  if (!activityHydrated || !learningHydrated || !toneHydrated || !masteryHydrated) {
    return <section className="py-10" aria-busy="true"><div className="h-10 w-48 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" /><div className="mt-8 h-72 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" /></section>;
  }

  const streak = calculateStreak(dates);
  const pairEntries = Object.entries(toneProgress.byPair).sort(([, a], [, b]) => b.total - a.total);
  const capabilitySummaries = calculateCapabilitySummaries(events).sort((a, b) => a.score - b.score);
  const completedDeepUnits = deepLessons.filter((unit) => calculateUnitMastery(events, unit.id).completedAt !== undefined).length;

  return (
    <section className="py-8 md:py-12">
      <header className="max-w-2xl">
        <p className="font-jyutping text-sm font-bold text-ember-dark dark:text-sky-300">your practice</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">學到邊度</h2>
        <p className="mt-4 leading-relaxed text-stone-600 dark:text-stone-300">睇返你練過幾多，同埋邊啲聲調仲要聽多幾次。</p>
      </header>


      <div className="mt-9 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-ember p-6 text-white sm:p-8">
          <Fire size={32} weight="fill" aria-hidden="true" />
          <p className="mt-8 text-6xl font-semibold tracking-tight">{streak}</p>
          <p className="mt-2 font-bold text-sky-50">日連續練習</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <Books size={32} weight="bold" className="text-ember" aria-hidden="true" />
          <p className="mt-8 text-5xl font-semibold tracking-tight">{learnedWords}</p>
          <p className="mt-2 font-bold text-stone-600 dark:text-stone-300">个情境词语</p>
        </div>
      </div>

      <section className="mt-12" aria-labelledby="ability-evidence-title">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="ability-evidence-title" className="text-3xl font-semibold tracking-tight">能力證據</h2><p className="mt-3 text-stone-600 dark:text-stone-300">最近練習會分開回寫，唔用一個黑箱總分蓋過薄弱位。</p></div><p className="font-jyutping text-sm font-bold text-stone-500">深度單元 {completedDeepUnits} / {deepLessons.length}</p></div>
        {capabilitySummaries.length > 0 ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{capabilitySummaries.map((summary) => { const capability = capabilityCatalog[summary.capabilityId]; if (capability === undefined) return null; return <article key={summary.capabilityId} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"><div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold">{capability.title}</h3><span className="font-jyutping text-xl font-semibold text-ember-dark dark:text-sky-300">{summary.score}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><div className="h-full rounded-full bg-ember" style={{ width: `${summary.score}%` }} /></div><p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{capability.description} · {summary.evidenceCount} 項證據</p></article>; })}</div> : <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900"><p className="font-semibold">未有能力證據</p><p className="mt-2 text-sm text-stone-500">完成五題摸底或者一個七環節單元之後，呢度會顯示強弱項。</p></div>}
      </section>

      <section className="mt-12" aria-labelledby="scenario-progress-title">
        <h2 id="scenario-progress-title" className="text-3xl font-semibold tracking-tight">情境课星级</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {scenarios.map((scenario) => {
            const stars = scenarioProgress[scenario.id]?.bestStars ?? 0;
            return (
              <div key={scenario.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{scenario.title}</p>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{scenarioProgress[scenario.id] === undefined ? "未完成" : `${scenarioProgress[scenario.id]?.attempts ?? 0} 次挑戰`}</p>
                </div>
                <div className="ml-4 flex gap-0.5 text-ember" aria-label={`${stars} 粒星`}>
                  {Array.from({ length: 3 }, (_, index) => <Star key={index} size={21} weight={index < stars ? "fill" : "regular"} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="tone-accuracy-title">
        <div className="max-w-2xl">
          <h2 id="tone-accuracy-title" className="text-3xl font-semibold tracking-tight">六聲命中率</h2>
          <p className="mt-3 text-stone-600 dark:text-stone-300">每條幼線代表你喺辨調題入面答啱嘅比例。</p>
        </div>
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <div className="grid gap-5">
            {TONE_DEFINITIONS.map((definition) => {
              const stat = toneProgress.byTone[definition.tone];
              const value = accuracy(stat?.correct, stat?.total);
              return (
                <div key={definition.tone} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
                  <span className="font-bold">第 {definition.tone} 聲</span>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" aria-hidden="true"><div className="h-full rounded-full transition-[width]" style={{ width: `${value}%`, backgroundColor: definition.color }} /></div>
                  <span className="text-right font-jyutping text-sm font-bold">{value}%</span>
                </div>
              );
            })}
          </div>
          {toneProgress.totalAnswers === 0 && <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">做幾題聽聲辨調，呢度就會開始記錄。</p>}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="pair-accuracy-title">
        <h2 id="pair-accuracy-title" className="text-3xl font-semibold tracking-tight">易混組合</h2>
        {pairEntries.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {pairEntries.map(([pair, stat]) => {
              const value = accuracy(stat.correct, stat.total);
              return (
                <div key={pair} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                  <div className="flex items-baseline justify-between gap-4"><span className="font-jyutping text-xl font-semibold">{pair}</span><span className="font-jyutping font-bold">{value}%</span></div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" aria-hidden="true"><div className="h-full rounded-full bg-ember transition-[width]" style={{ width: `${value}%` }} /></div>
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">{stat.correct} / {stat.total} 題答啱</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900"><Waveform size={36} className="text-stone-400" /><p className="mt-4 font-semibold">未有辨調紀錄</p><p className="mt-2 text-sm text-stone-500 dark:text-stone-400">去聲調道場答題之後，易混組合會喺度出現。</p></div>
        )}
      </section>
    </section>
  );
}
