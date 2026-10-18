import { ArrowLeft, ArrowRight, CheckCircle, Gauge } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { useMasteryStore } from "../stores/masteryStore";

const items = [
  { prompt: "聽完「食」，揀返入聲收尾", speech: "食", options: ["-m", "-k", "-ng"], answer: "-k", unitId: "sound-system", capabilityIds: ["pronunciation.jyutping", "tone.checked"] },
  { prompt: "「有冇位呀？」想問咩？", speech: "有冇位呀", options: ["有沒有座位", "位置在哪里", "要不要离开"], answer: "有沒有座位", unitId: "core-particles", capabilityIds: ["pattern.core"] },
  { prompt: "「聽日下晝三點」係幾時？", speech: "聽日下晝三點", options: ["今天三点", "明天下午三点", "明早三点"], answer: "明天下午三点", unitId: "time-weather", capabilityIds: ["listening.key-info"] },
  { prompt: "聽唔明時，邊句最自然？", speech: "可唔可以講慢啲", options: ["可唔可以講慢啲？", "你講大聲啲。", "我聽到喇。"], answer: "可唔可以講慢啲？", unitId: "repair", capabilityIds: ["speaking.repair"] },
  { prompt: "邊句可以禮貌表達保留？", speech: "我明你意思，不過我有少少保留", options: ["你錯喇。", "我明你意思，不過我有少少保留。", "我不接受。"], answer: "我明你意思，不過我有少少保留。", unitId: "opinions", capabilityIds: ["speaking.opinion"] },
];

export function DiagnosticPage() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const { hydrated, hydrate, recordEvidence } = useMasteryStore();

  useEffect(() => { if (!hydrated) void hydrate(); }, [hydrate, hydrated]);
  const item = items[index];

  const answer = (choice: string) => {
    if (item === undefined) return;
    const correct = choice === item.answer;
    void recordEvidence({ unitId: item.unitId, capabilityIds: item.capabilityIds, stepId: "diagnose", kind: "diagnostic", score: correct ? 85 : 30, errorType: correct ? undefined : item.capabilityIds[0]?.startsWith("tone") ? "tone" : "meaning" });
    setScore((value) => value + (correct ? 1 : 0));
    if (index === items.length - 1) setFinished(true); else setIndex((value) => value + 1);
  };

  if (!hydrated) return <section className="py-10" aria-busy="true"><div className="h-80 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" /></section>;

  return (
    <section className="mx-auto max-w-3xl py-8 md:py-12">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-2xl text-sm font-bold text-stone-600 dark:text-stone-300"><ArrowLeft size={18} weight="bold" /> 返回今日路線</Link>
      <header className="mt-7 border-b border-stone-200 pb-7 dark:border-stone-800">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember text-white"><Gauge size={30} weight="bold" /></div>
        <p className="mt-6 font-jyutping text-sm font-semibold text-ember-dark dark:text-sky-300">5 min placement</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">先摸底，唔使由識嘅開始</h1>
        <p className="mt-4 leading-relaxed text-stone-600 dark:text-stone-300">只用五題搵第一批能力證據。答錯唔扣分，系統會用嚟安排補底。</p>
      </header>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-7">
        {!finished && item !== undefined ? (
          <>
            <div className="flex items-center justify-between gap-4"><span className="font-jyutping text-sm font-bold text-stone-500">{index + 1} / {items.length}</span><CantoneseSpeakButton text={item.speech} /></div>
            <h2 className="mt-6 text-2xl font-semibold">{item.prompt}</h2>
            <div className="mt-6 grid gap-3">{item.options.map((option) => <button key={option} type="button" onClick={() => answer(option)} className="min-h-14 rounded-2xl border-2 border-stone-200 px-5 text-left font-semibold transition hover:border-ember active:scale-[0.98] dark:border-stone-700">{option}</button>)}</div>
          </>
        ) : (
          <div className="py-5 text-center"><CheckCircle size={60} weight="fill" className="mx-auto text-sky-600" /><h2 className="mt-5 text-3xl font-semibold">摸底完成</h2><p className="mt-3 text-stone-600 dark:text-stone-300">答啱 {score} / {items.length}。今日路線會優先補返薄弱能力。</p><Link to="/" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ember px-6 font-semibold text-white active:scale-[0.98]">睇今日處方 <ArrowRight size={19} weight="bold" /></Link></div>
        )}
      </div>
    </section>
  );
}
