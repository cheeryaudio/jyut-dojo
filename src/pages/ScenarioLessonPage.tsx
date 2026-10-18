import { ArrowLeft, Exam } from "@phosphor-icons/react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SentenceCard } from "../components/SentenceCard";
import { scenarios, sentenceById } from "../data";

export function ScenarioLessonPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const scenario = scenarios.find((item) => item.id === scenarioId);

  if (scenario === undefined) return <Navigate to="/scenarios" replace />;

  const lessonSentences = scenario.sentences.map((id) => sentenceById.get(id)).filter((item) => item !== undefined);

  return (
    <section className="py-8 md:py-12">
      <Link to="/scenarios" className="inline-flex min-h-11 items-center gap-2 rounded-2xl text-sm font-bold text-stone-600 hover:text-ember-dark dark:text-stone-300">
        <ArrowLeft size={18} weight="bold" />
        返回情境
      </Link>

      <header className="mt-7 grid gap-6 border-b border-stone-200 pb-8 dark:border-stone-800 md:grid-cols-[auto_1fr] md:items-end">
        <span className="text-6xl" aria-hidden="true">{scenario.emoji}</span>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{scenario.title}</h1>
          <p className="mt-3 max-w-[56ch] leading-relaxed text-stone-600 dark:text-stone-300">{scenario.intro}</p>
          <p className="mt-3 text-sm font-bold text-ember-dark dark:text-sky-300">撳句子聽聲，撳單字睇提示</p>
        </div>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {lessonSentences.map((sentence, index) => (
          <SentenceCard key={sentence.id} sentence={sentence} index={index} />
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-ember p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="text-2xl font-semibold">聽完十句，試下接招。</h2>
          <p className="mt-2 text-sm leading-relaxed text-sky-50">三種題型，每題一粒星。最佳成績會留喺呢部裝置。</p>
        </div>
        <Link to={`/scenarios/${scenario.id}/quiz`} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-semibold text-ember-dark transition active:scale-[0.98] sm:mt-0">
          <Exam size={21} weight="bold" />
          開始測驗
        </Link>
      </div>
    </section>
  );
}
