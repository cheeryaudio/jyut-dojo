import { ArrowLeft, ArrowRight, Check, CheckCircle, Clock, Headphones, Lightbulb, Microphone, Repeat, Shuffle, Target } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { deepLessonById } from "../data/deepLessons";
import { scenarios, sentenceById } from "../data";
import { calculateUnitMastery, LESSON_STEPS, nextLessonStepIndex } from "../lib/mastery";
import { useMasteryStore } from "../stores/masteryStore";
import { useLearningStore } from "../stores/learningStore";
import type { DeepLessonUnit, EvidenceKind, LessonStepId } from "../types/learning";

const stepMeta: Record<LessonStepId, { title: string; short: string }> = {
  diagnose: { title: "先聽先答", short: "摸底" }, input: { title: "成段聽明", short: "輸入" }, breakdown: { title: "拆開口語機關", short: "拆解" }, practice: { title: "控制練習", short: "練習" }, output: { title: "輪到你講", short: "開口" }, transfer: { title: "換個情境再用", short: "遷移" }, delayed: { title: "隔日再驗", short: "回測" },
};

const evidenceKind: Record<LessonStepId, EvidenceKind> = { diagnose: "diagnostic", input: "comprehension", breakdown: "comprehension", practice: "controlled", output: "spoken", transfer: "transfer", delayed: "review" };

const scenarioPedagogy: Record<string, { pattern: string; patternNote: string; substitutions: string[]; transfer: string }> = {
  greetings: { pattern: "我係 + 名／身份", patternNote: "先介紹自己，再問對方，最後用一句自然回應接住。", substitutions: ["名", "邊度人", "住邊區"], transfer: "換成新同事場合，介紹自己再約下次食飯。" },
  "cha-chaan-teng": { pattern: "唔該，我要 + 餐飲／要求", patternNote: "先叫餐飲，再補凍熱、少甜同走唔走冰。", substitutions: ["凍奶茶", "熱咖啡", "少甜", "走冰"], transfer: "換一間茶餐廳，叫另一份餐同提出一個改動。" },
  directions: { pattern: "請問 + 地點 + 喺邊呀？", patternNote: "先講目的地，聽完方向之後重複轉彎位置確認。", substitutions: ["地鐵站", "洗手間", "巴士站"], transfer: "改問一個新地點，再確認係左轉定右轉。" },
  mtr: { pattern: "去 + 地點 + 喺邊個月台？", patternNote: "問清楚路線、月台、轉車站同落車站。", substitutions: ["中環", "旺角", "金鐘"], transfer: "由另一個車站出發，問一次完整轉車方法。" },
  shopping: { pattern: "有冇 + 尺碼／顏色 + 啲㗎？", patternNote: "先問價同尺碼，再試身，最後先自然噉講價。", substitutions: ["大一個碼", "淺色啲", "平少少"], transfer: "將貨品換成鞋，再問尺碼、顏色同退換安排。" },
  phone: { pattern: "我係 + 名，你而家得唔得閒？", patternNote: "電話先確認身份，再問對方方唔方便講，之後先入正題。", substitutions: ["約時間", "改地點", "交代遲到"], transfer: "打畀同事改會議時間，最後完整確認一次。" },
};

const buildScenarioUnit = (scenarioId: string): DeepLessonUnit | undefined => {
  const scenario = scenarios.find((item) => item.id === scenarioId);
  const pedagogy = scenarioPedagogy[scenarioId];
  if (scenario === undefined || pedagogy === undefined) return undefined;
  const phrases = scenario.sentences.map((id) => sentenceById.get(id)).filter((sentence) => sentence !== undefined).map((sentence) => ({ id: sentence.id, hanzi: sentence.hanzi, jyutping: sentence.jyutping, mandarin: sentence.mandarin, audio: sentence.audio, note: "先聽語氣同句尾，再留意關鍵資訊。" }));
  return { id: scenario.id, level: 1, title: scenario.title, mandarin: scenario.intro, context: `你會喺真實「${scenario.title}」情境完成一輪對話。`, goal: scenario.intro, capabilityIds: ["vocabulary.daily", "listening.key-info", "speaking.task"], phrases, pattern: pedagogy.pattern, patternNote: pedagogy.patternNote, substitutions: pedagogy.substitutions, rolePrompt: `唔睇原句，完成一次「${scenario.title}」角色回應。`, transferPrompt: pedagogy.transfer, repairTip: "聽漏關鍵資訊時，重複你聽到嘅部分，再請對方補返。" };
};

export function DeepLessonPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const unit = unitId === undefined ? undefined : deepLessonById.get(unitId) ?? buildScenarioUnit(unitId);
  const { events, delayedChecks, hydrated, hydrate, recordEvidence, scheduleDelayedCheck, completeDelayedCheck } = useMasteryStore();
  const mastery = useMemo(() => calculateUnitMastery(events, unitId ?? ""), [events, unitId]);
  const firstIncomplete = LESSON_STEPS.findIndex((step) => !mastery.completedSteps.includes(step));
  const [stepIndex, setStepIndex] = useState(firstIncomplete < 0 ? 6 : firstIncomplete);
  const [practiceChoice, setPracticeChoice] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const recordQuizResult = useLearningStore((state) => state.recordQuizResult);

  useEffect(() => { if (!hydrated) void hydrate(); }, [hydrate, hydrated]);
  useEffect(() => { if (hydrated) setStepIndex(firstIncomplete < 0 ? 6 : firstIncomplete); }, [firstIncomplete, hydrated, unitId]);

  if (unit === undefined) return <Navigate to="/path" replace />;
  if (!hydrated) return <section className="py-10" aria-busy="true"><div className="h-96 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" /></section>;

  const stepId = LESSON_STEPS[stepIndex] ?? "diagnose";
  const check = delayedChecks.find((item) => item.unitId === unit.id && item.completedAt === undefined);
  const due = check !== undefined && new Date(check.due).getTime() <= Date.now();

  const finishStep = async (score: number) => {
    setStepIndex(nextLessonStepIndex(stepId));
    if (stepId === "delayed") {
      await completeDelayedCheck(unit.id, score, unit.capabilityIds);
      if (scenarios.some((scenario) => scenario.id === unit.id)) await recordQuizResult(unit.id, score >= 80 ? 3 : score >= 60 ? 2 : 1);
    } else {
      await recordEvidence({ unitId: unit.id, capabilityIds: unit.capabilityIds, stepId, kind: evidenceKind[stepId], score, errorType: score < 60 ? stepId === "output" ? "fluency" : "meaning" : undefined });
      if (stepId === "transfer") await scheduleDelayedCheck(unit.id);
    }
    setPracticeChoice(null);
    setRecorded(false);
  };

  const practiceTarget = unit.phrases[0];
  const practiceOptions = unit.phrases.slice(0, 3).map((phrase) => phrase.hanzi);

  return (
    <section className="py-8 md:py-12">
      <Link to="/path" className="inline-flex min-h-11 items-center gap-2 rounded-2xl text-sm font-bold text-stone-600 dark:text-stone-300"><ArrowLeft size={18} weight="bold" /> 返回能力地圖</Link>
      <header className="mt-6 grid gap-5 border-b border-stone-200 pb-7 dark:border-stone-800 md:grid-cols-[1fr_auto] md:items-end">
        <div><p className="font-jyutping text-sm font-semibold text-ember-dark dark:text-sky-300">LEVEL {unit.level} · {unit.mandarin}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{unit.title}</h1><p className="mt-3 max-w-[58ch] leading-relaxed text-stone-600 dark:text-stone-300">{unit.context}</p></div>
        <div className="rounded-2xl bg-stone-100 px-5 py-4 dark:bg-stone-900"><span className="font-jyutping text-3xl font-semibold">{mastery.score}%</span><span className="ml-2 text-sm text-stone-500">掌握證據</span></div>
      </header>

      <nav className="mt-6 overflow-x-auto pb-2" aria-label="課堂環節"><ol className="flex min-w-max gap-2">{LESSON_STEPS.map((step, index) => { const complete = mastery.completedSteps.includes(step); return <li key={step}><button type="button" onClick={() => setStepIndex(index)} className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold ${index === stepIndex ? "border-ember bg-sky-50 text-ember-dark dark:bg-sky-950 dark:text-sky-200" : "border-stone-200 dark:border-stone-800"}`}>{complete && <Check size={16} weight="bold" />}{index + 1}. {stepMeta[step].short}</button></li>; })}</ol></nav>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <main className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <p className="font-jyutping text-xs font-semibold text-ember-dark dark:text-sky-300">STEP {stepIndex + 1} / 7</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{stepMeta[stepId].title}</h2>

          {stepId === "diagnose" && <div className="mt-6"><p className="text-lg font-bold">未睇提示之前，你對今課有幾熟？</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => void finishStep(25)} className="min-h-16 rounded-2xl border-2 border-stone-200 font-semibold active:scale-[0.98] dark:border-stone-700">完全未識</button><button type="button" onClick={() => void finishStep(55)} className="min-h-16 rounded-2xl border-2 border-stone-200 font-semibold active:scale-[0.98] dark:border-stone-700">有少少印象</button><button type="button" onClick={() => void finishStep(80)} className="min-h-16 rounded-2xl border-2 border-stone-200 font-semibold active:scale-[0.98] dark:border-stone-700">大部分識</button></div></div>}

          {stepId === "input" && <div className="mt-6"><p className="leading-relaxed text-stone-600 dark:text-stone-300">先聽完整句，第一轉只捉意思，第二轉先睇粵拼同提示。</p><div className="mt-5 divide-y divide-stone-200 dark:divide-stone-800">{unit.phrases.map((phrase) => <article key={phrase.id} className="py-5 first:pt-0"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-semibold">{phrase.hanzi}</h3><p className="mt-1 font-jyutping font-bold text-ember-dark dark:text-sky-300">{phrase.jyutping}</p><p className="mt-1 text-sm text-stone-500">{phrase.mandarin}</p></div><CantoneseSpeakButton text={phrase.hanzi} /></div></article>)}</div><button type="button" onClick={() => void finishStep(75)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ember px-5 font-semibold text-white active:scale-[0.98]">五句聽過兩次 <ArrowRight size={19} weight="bold" /></button></div>}

          {stepId === "breakdown" && <div className="mt-6"><div className="rounded-2xl bg-sky-50 p-5 dark:bg-sky-950"><Lightbulb size={26} weight="fill" className="text-ember" /><p className="mt-4 text-2xl font-semibold">{unit.pattern}</p><p className="mt-3 leading-relaxed text-stone-700 dark:text-stone-200">{unit.patternNote}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{unit.phrases.map((phrase) => <div key={phrase.id} className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800"><p className="font-semibold">{phrase.hanzi}</p><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{phrase.note}</p></div>)}</div><button type="button" onClick={() => void finishStep(78)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ember px-5 font-semibold text-white active:scale-[0.98]">明白口語機關 <ArrowRight size={19} weight="bold" /></button></div>}

          {stepId === "practice" && practiceTarget !== undefined && <div className="mt-6"><p className="text-lg font-bold">揀返「{practiceTarget.mandarin}」最自然嘅講法</p><div className="mt-5 grid gap-3">{practiceOptions.map((option) => <button key={option} type="button" disabled={practiceChoice !== null} onClick={() => setPracticeChoice(option)} className={`min-h-14 rounded-2xl border-2 px-5 text-left font-semibold ${practiceChoice === option ? option === practiceTarget.hanzi ? "border-sky-600 bg-sky-50 dark:bg-sky-950" : "border-red-600 bg-red-50 dark:bg-red-950" : "border-stone-200 dark:border-stone-700"}`}>{option}</button>)}</div>{practiceChoice !== null && <button type="button" onClick={() => void finishStep(practiceChoice === practiceTarget.hanzi ? 90 : 45)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ember px-5 font-semibold text-white active:scale-[0.98]">記低今次結果 <ArrowRight size={19} weight="bold" /></button>}</div>}

          {stepId === "output" && <div className="mt-6"><div className="rounded-2xl bg-stone-100 p-5 dark:bg-stone-800"><Microphone size={25} weight="bold" className="text-ember" /><p className="mt-3 text-lg font-semibold">{unit.rolePrompt}</p><p className="mt-2 text-sm text-stone-500 dark:text-stone-400">先聽一個示範句，再錄自己。唔使逐字跟稿。</p><div className="mt-4"><CantoneseSpeakButton text={unit.phrases[0]?.hanzi ?? ""} label="聽一個示範" /></div></div><div className="mt-4"><VoiceRecorder onRecorded={() => setRecorded(true)} /></div><p className="mt-5 font-semibold">講完之後，誠實揀返表現</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => void finishStep(45)} className="min-h-14 rounded-2xl border-2 border-stone-200 font-semibold dark:border-stone-700">要睇稿先講到</button><button type="button" onClick={() => void finishStep(70)} className="min-h-14 rounded-2xl border-2 border-stone-200 font-semibold dark:border-stone-700">停一停都講到</button><button type="button" onClick={() => void finishStep(88)} className="min-h-14 rounded-2xl border-2 border-stone-200 font-semibold dark:border-stone-700">自然完成</button></div>{!recorded && <p className="mt-3 text-xs text-stone-500">未錄音都可以自評，方便未授權咪高峰嘅裝置。</p>}</div>}

          {stepId === "transfer" && <div className="mt-6"><div className="rounded-2xl border-2 border-ember p-5"><Shuffle size={27} weight="bold" className="text-ember" /><p className="mt-4 text-xl font-semibold">{unit.transferPrompt}</p><p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">可替換：{unit.substitutions.join("、")}</p></div><p className="mt-5 rounded-2xl bg-stone-100 p-4 text-sm leading-relaxed dark:bg-stone-800"><strong>卡住點算：</strong>{unit.repairTip}</p><button type="button" onClick={() => void finishStep(82)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ember px-5 font-semibold text-white active:scale-[0.98]">完成遷移任務 <ArrowRight size={19} weight="bold" /></button></div>}

          {stepId === "delayed" && <div className="mt-6 text-center">{check === undefined && mastery.completedSteps.includes("delayed") ? <><CheckCircle size={64} weight="fill" className="mx-auto text-sky-600" /><h3 className="mt-5 text-3xl font-semibold">單元已完成</h3><p className="mt-3 text-stone-600 dark:text-stone-300">七個環節都有能力證據，可以返能力地圖行下一步。</p><Link to="/path" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ember px-6 font-semibold text-white">揀下一課 <ArrowRight size={19} weight="bold" /></Link></> : check !== undefined && !due ? <><Clock size={58} weight="bold" className="mx-auto text-ember" /><h3 className="mt-5 text-3xl font-semibold">聽日先再驗</h3><p className="mt-3 text-stone-600 dark:text-stone-300">真正記得要隔一晚再提取。到期時間：{new Date(check.due).toLocaleString("zh-HK", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p><Link to="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-300 px-6 font-semibold dark:border-stone-700">返回今日路線</Link></> : <><Repeat size={58} weight="bold" className="mx-auto text-ember" /><h3 className="mt-5 text-3xl font-semibold">唔睇筆記，講返核心句型</h3><p className="mt-3 text-stone-600 dark:text-stone-300">{unit.pattern}</p><div className="mx-auto mt-5 max-w-sm"><VoiceRecorder onRecorded={() => setRecorded(true)} /></div><button type="button" onClick={() => void finishStep(recorded ? 88 : 70)} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-ember px-6 font-semibold text-white">完成隔日回測</button></>}</div>}
        </main>

        <aside className="space-y-4"><div className="rounded-2xl bg-ember p-5 text-white"><Target size={25} weight="bold" /><p className="mt-4 text-sm font-bold text-sky-50">今課做到</p><p className="mt-2 text-lg font-semibold">{unit.goal}</p></div><div className="rounded-2xl border border-stone-200 p-5 dark:border-stone-800"><Headphones size={24} className="text-ember" /><p className="mt-4 font-semibold">學習原則</p><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">先捉意思，再拆語音；先控制練習，再離開原句完成任務。</p></div></aside>
      </div>
    </section>
  );
}
