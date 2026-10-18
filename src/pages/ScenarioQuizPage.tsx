import { ArrowLeft, Check, Star } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChoiceQuiz } from "../components/quiz/ChoiceQuiz";
import { ReorderQuiz } from "../components/quiz/ReorderQuiz";
import { scenarios, sentenceById } from "../data";
import { buildDialogueQuestion, buildListenQuestion, buildReorderSentence } from "../lib/quiz";
import { useLearningStore } from "../stores/learningStore";
import type { Sentence } from "../types/domain";

export function ScenarioQuizPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const scenario = scenarios.find((item) => item.id === scenarioId);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const recordQuizResult = useLearningStore((state) => state.recordQuizResult);

  if (scenario === undefined) return <Navigate to="/scenarios" replace />;

  const lessonSentences = scenario.sentences.map((id) => sentenceById.get(id)).filter((item): item is Sentence => item !== undefined);
  const listenQuestion = buildListenQuestion(lessonSentences);
  const reorderSentence = buildReorderSentence(lessonSentences);
  const dialogueQuestion = buildDialogueQuestion(lessonSentences);

  const finishQuestion = (correct: boolean) => {
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    if (questionIndex === 2) {
      setFinished(true);
      void recordQuizResult(scenario.id, nextScore);
    } else {
      setQuestionIndex((index) => index + 1);
    }
  };

  return (
    <section className="mx-auto max-w-3xl py-8 md:py-12">
      <Link to={`/scenarios/${scenario.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl text-sm font-bold text-stone-600 hover:text-ember-dark dark:text-stone-300">
        <ArrowLeft size={18} weight="bold" />
        返回課堂
      </Link>

      <header className="mt-6 flex items-end justify-between gap-4 border-b border-stone-200 pb-6 dark:border-stone-800">
        <div>
          <p className="text-sm font-bold text-ember-dark dark:text-sky-300">{scenario.title}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">課後三式</h1>
        </div>
        <span className="font-jyutping text-sm font-bold text-stone-500 dark:text-stone-300">{finished ? "完成" : `${questionIndex + 1} / 3`}</span>
      </header>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:p-7 dark:border-stone-800 dark:bg-stone-900">
        {!finished && questionIndex === 0 && (
          <ChoiceQuiz prompt="聽聲揀返啱嗰句" audioPath={listenQuestion.target.audio} options={listenQuestion.options} answerId={listenQuestion.target.id} onComplete={finishQuestion} />
        )}
        {!finished && questionIndex === 1 && <ReorderQuiz sentence={reorderSentence} onComplete={finishQuestion} />}
        {!finished && questionIndex === 2 && (
          <ChoiceQuiz prompt="聽完上句，揀最自然嘅回應" audioPath={dialogueQuestion.prompt.audio} options={dialogueQuestion.options} answerId={dialogueQuestion.answer.id} onComplete={finishQuestion} />
        )}
        {finished && (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"><Check size={32} weight="bold" /></span>
            <h2 className="mt-5 text-3xl font-semibold">今課完成</h2>
            <div className="mt-4 flex justify-center gap-1 text-3xl text-ember" aria-label={`${score} 粒星`}>
              {Array.from({ length: 3 }, (_, index) => <Star key={index} weight={index < score ? "fill" : "regular"} />)}
            </div>
            <p className="mt-4 text-stone-600 dark:text-stone-300">今次答啱 {score} 題。系統會保留你最好嘅星級。</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={`/scenarios/${scenario.id}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 font-semibold active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800">再聽一次</Link>
              <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-ember px-5 font-semibold text-white active:scale-[0.98]">揀下一課</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
