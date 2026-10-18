import { ArrowLeft, ArrowRight, CheckCircle, LockSimple, MapTrifold } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { curriculumStages } from "../data/curriculum";
import { useLearningStore } from "../stores/learningStore";
import { useToneStore } from "../stores/toneStore";
import { useMasteryStore } from "../stores/masteryStore";
import { calculateUnitMastery } from "../lib/mastery";

export function LearningPathPage() {
  const scenarioProgress = useLearningStore((state) => state.scenarioProgress);
  const learningHydrated = useLearningStore((state) => state.hydrated);
  const hydrateLearning = useLearningStore((state) => state.hydrate);
  const toneAnswers = useToneStore((state) => state.progress.totalAnswers);
  const toneHydrated = useToneStore((state) => state.hydrated);
  const hydrateTone = useToneStore((state) => state.hydrate);
  const events = useMasteryStore((state) => state.events);
  const masteryHydrated = useMasteryStore((state) => state.hydrated);
  const hydrateMastery = useMasteryStore((state) => state.hydrate);

  useEffect(() => {
    if (!learningHydrated) void hydrateLearning();
    if (!toneHydrated) void hydrateTone();
    if (!masteryHydrated) void hydrateMastery();
  }, [hydrateLearning, hydrateMastery, hydrateTone, learningHydrated, masteryHydrated, toneHydrated]);

  const isCompleted = (unitId: string): boolean => unitId === "six-tones" ? toneAnswers >= 10 : scenarioProgress[unitId] !== undefined || calculateUnitMastery(events, unitId).completedAt !== undefined;

  if (!learningHydrated || !toneHydrated || !masteryHydrated) {
    return <section className="py-10" aria-busy="true"><div className="h-10 w-56 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" /><div className="mt-8 h-96 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" /></section>;
  }

  return (
    <section className="py-8 md:py-12">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-2xl text-sm font-bold text-stone-600 hover:text-ember-dark dark:text-stone-300"><ArrowLeft size={18} weight="bold" /> 返回首页</Link>
      <header className="mt-7 max-w-3xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember text-white"><MapTrifold size={30} weight="bold" /></div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">分级课程</h1>

      </header>

      <div className="mt-10 grid gap-6">
        {curriculumStages.map((stage) => {
          const readyUnits = stage.units.filter((unit) => unit.status === "ready");
          const completed = readyUnits.filter((unit) => isCompleted(unit.id)).length;
          return (
            <section key={stage.id} className="grid gap-5 border-t border-stone-200 pt-7 dark:border-stone-800 md:grid-cols-[12rem_1fr]" aria-labelledby={`stage-${stage.id}`}>
              <div>
                <p className="font-jyutping text-sm font-semibold text-ember-dark dark:text-sky-300">LEVEL {stage.level}</p>
                <h2 id={`stage-${stage.id}`} className="mt-2 text-2xl font-semibold">{stage.title}</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{stage.mandarin}</p>
                {readyUnits.length > 0 && <p className="mt-4 font-jyutping text-xs font-bold text-stone-500">{completed} / {readyUnits.length} 已完成</p>}
              </div>

              <div>
                <p className="max-w-[55ch] leading-relaxed text-stone-600 dark:text-stone-300">{stage.outcome}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {stage.units.map((unit) => {
                    const complete = isCompleted(unit.id);
                    const content = (
                      <>
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block font-semibold">{unit.title}</span>
                            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">{unit.mandarin}</span>
                          </span>
                          {complete ? <CheckCircle size={22} weight="fill" className="shrink-0 text-sky-600" /> : unit.status === "planned" ? <LockSimple size={21} className="shrink-0 text-stone-400" /> : <ArrowRight size={20} weight="bold" className="shrink-0 text-ember" />}
                        </span>
                        <span className="mt-3 block text-sm leading-relaxed text-stone-600 dark:text-stone-300">{unit.description}</span>
                        <span className="mt-4 block font-jyutping text-xs font-bold text-stone-500">{unit.status === "planned" ? "規劃中，未開放" : `約 ${unit.minutes} min`}</span>
                      </>
                    );
                    return unit.route === undefined ? (
                      <div key={unit.id} className="rounded-2xl border border-stone-200 bg-stone-100/60 p-5 opacity-75 dark:border-stone-800 dark:bg-stone-900">{content}</div>
                    ) : (
                      <Link key={unit.id} to={unit.route} className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-ember/60 hover:shadow-warm active:scale-[0.99] dark:border-stone-800 dark:bg-stone-900">{content}</Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
