import { ArrowRight, BookmarkSimple, Check, CheckCircle, Repeat, ArrowCounterClockwise } from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { getCourseMistakes, getPracticePhrases } from "../lib/coursePractice";
import { useCourseStore } from "../stores/courseStore";

const LegacyWordReview = lazy(() => import("../components/LegacyWordReview").then(module => ({ default: module.LegacyWordReview })));
type PracticePhrase = ReturnType<typeof getPracticePhrases>[number];

function ExpressionPractice({ deck, source }: { deck: PracticePhrase[]; source: "saved" | "learned" }) {
  const [queue, setQueue] = useState<PracticePhrase[]>(() => deck.slice(0, 10));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [retry, setRetry] = useState<PracticePhrase[]>([]);
  const [offset, setOffset] = useState(0);
  const recordReview = useCourseStore(state => state.recordPhraseReview);
  const current = queue[position];
  const start = (items: PracticePhrase[]) => { setQueue(items.slice(0, 10)); setPosition(0); setRevealed(false); setRemembered(0); setRetry([]); };
  const nextGroup = () => { const nextOffset = offset + 10 < deck.length ? offset + 10 : 0; setOffset(nextOffset); start(deck.slice(nextOffset, nextOffset + 10)); };
  const rate = (didRemember: boolean) => {
    if (!current) return;
    recordReview(current.phrase.id, didRemember);
    if (didRemember) setRemembered(value => value + 1);
    else setRetry(items => [...items, current]);
    setRevealed(false);
    setPosition(value => value + 1);
  };
  if (deck.length === 0) return <div className="practice-empty"><BookmarkSimple size={32} /><h2>{source === "saved" ? "暂无收藏表达" : "还没有学完的课程"}</h2><Link to="/scenarios" className="button-primary">浏览课程 <ArrowRight size={17} /></Link></div>;
  if (!current) return <div className="practice-complete"><CheckCircle size={38} /><h2>本组完成</h2><p>本组共 {queue.length} 句，记得 {remembered} 句，需再练 {retry.length} 句。</p><div className="practice-complete-actions">{retry.length > 0 && <button className="button-primary" onClick={() => start(retry)}><Repeat size={18} /> 再练这 {retry.length} 句</button>}<button className="button-outline" onClick={nextGroup}><ArrowCounterClockwise size={17} /> 下一组</button><Link className="text-link" to="/saved">查看收藏 <ArrowRight size={16} /></Link></div></div>;
  return <div className="expression-practice">
    <div className="practice-session-heading"><span>本组 {position + 1} / {queue.length}</span><Link to={`/courses/${current.course.id}#${current.phrase.id}`}>{current.course.title} <ArrowRight size={14} /></Link></div>
    <div className="practice-session-track" aria-label={`已回想 ${position} / ${queue.length} 句`}><span style={{ width: `${position / queue.length * 100}%` }} /></div>
    <article className="recall-paper"><p className="small-label">用粤语说出这句话</p><h2>{current.phrase.mandarin}</h2>
      {revealed ? <div className="recall-answer" aria-live="polite"><h3>{current.phrase.hanzi}</h3><p className="jyutping">{current.phrase.jyutping}</p>{current.phrase.note && <p>{current.phrase.note}</p>}<CantoneseSpeakButton text={current.phrase.hanzi} audio={current.phrase.audio} label="听示范" /></div> : <p className="recall-hint" aria-hidden="true" />}
      <div className="recall-controls">{revealed ? <><button className="button-outline" onClick={() => rate(false)}><Repeat size={18} /> 需要再练</button><button className="button-primary" onClick={() => rate(true)}><Check size={18} /> 记得</button></> : <button className="button-primary" onClick={() => setRevealed(true)}>查看答案</button>}</div>
    </article>
  </div>;
}

function MistakePractice() {
  const { progress, answerExercise } = useCourseStore();
  const mistakes = getCourseMistakes(progress);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  return <div className="mistake-practice">{mistakes.length > 0 ? <><div className="section-heading"><div><h2>错题订正</h2><p className="small-label">{mistakes.length} 道课程练习待订正</p></div></div><div className="exercise-stack">{mistakes.map(({ course, exercise, answer }) => {
    const choice = corrections[exercise.id];
    return <article className="exercise-block" key={exercise.id}><Link className="text-link" to={`/courses/${course.id}#practice`}>{course.title} <ArrowRight size={14} /></Link><h3>{exercise.prompt}</h3><p className="mistake-previous">上次选择：{answer}</p><div className="exercise-options">{exercise.options.map((option,index) => <button type="button" key={option} disabled={Boolean(choice)} className={choice ? option === exercise.answer ? "correct" : option === choice ? "incorrect" : "" : ""} onClick={() => setCorrections(values => ({ ...values, [exercise.id]: option }))}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{choice && <div className="exercise-feedback" role="status"><strong>{choice === exercise.answer ? "答对" : "答案不正确"}</strong><p>{exercise.explanation}</p>{choice === exercise.answer ? <button type="button" onClick={() => answerExercise(course.id, exercise.id, exercise.answer)}>记录订正，移出错题</button> : <button type="button" onClick={() => setCorrections(values => ({...values, [exercise.id]: ""}))}>再试一次</button>}</div>}</article>;
  })}</div></> : <div className="practice-empty"><CheckCircle size={35} /><h2>目前没有待订正的课内错题</h2><Link to="/scenarios" className="button-outline">浏览课程 <ArrowRight size={16} /></Link></div>}</div>;
}

export function ReviewPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "mistakes" ? "mistakes" : params.get("tab") === "legacy" ? "legacy" : "expressions";
  const { progress, bookmarks, phraseReviews, hydrated, hydrate, storageError } = useCourseStore();
  const [source, setSource] = useState<"saved" | "learned">("saved");
  useEffect(() => { void hydrate(); }, [hydrate]);
  const [practiceRound, setPracticeRound] = useState(0);
  const [session, setSession] = useState<{ source: "saved" | "learned"; deck: PracticePhrase[] } | null>(null);
  const deck = useMemo(() => getPracticePhrases(progress, bookmarks, source).sort((a,b) => (phraseReviews[a.phrase.id]?.reviewedAt ?? "").localeCompare(phraseReviews[b.phrase.id]?.reviewedAt ?? "")), [progress, bookmarks, source, phraseReviews]);
  const mistakes = getCourseMistakes(progress);
  const chooseSource = (value: "saved" | "learned") => { setSource(value); setSession(null); };
  return <div className="practice-page page-enter"><header className="journal-header"><div><h1>温习</h1></div></header>
    <nav className="practice-tabs" aria-label="温习内容">{[{ id:"expressions", label:"表达回想" },{ id:"mistakes",label:`课内错题${mistakes.length ? ` · ${mistakes.length}` : ""}` },{ id:"legacy",label:"词卡温习" }].map(item => <button type="button" key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => setParams(item.id === "expressions" ? {} : { tab:item.id })}>{item.label}</button>)}</nav>
    {storageError && <p role="status" className="storage-error">{storageError}</p>}
    {!hydrated ? <div className="practice-loading" role="status">正在读取温习记录…</div> : tab === "legacy" ? <Suspense fallback={<p role="status">正在读取词卡…</p>}><div className="legacy-review"><LegacyWordReview /></div></Suspense> : tab === "mistakes" ? <MistakePractice /> : <><div className="recall-toolbar"><div className="segmented"><button type="button" aria-pressed={source === "saved"} onClick={() => chooseSource("saved")}>我的收藏</button><button type="button" aria-pressed={source === "learned"} onClick={() => chooseSource("learned")}>已完成课程</button></div><Link to="/saved" className="text-link">管理收藏 <ArrowRight size={16} /></Link></div>{session ? <div><div className="practice-restart"><button className="text-link" onClick={() => setSession(null)}>重新选择范围</button></div><ExpressionPractice key={practiceRound} source={session.source} deck={session.deck} /></div> : deck.length === 0 ? <ExpressionPractice key={source} deck={[]} source={source} /> : <div className="practice-start"><div><p className="small-label">{source === "saved" ? "收藏表达" : "已完成课程的表达"}</p><h2>{deck.length} 句待温习表达</h2></div><button className="button-primary" onClick={() => {setSession({ source, deck }); setPracticeRound(value => value + 1);}}>开始温习 <ArrowRight size={17} /></button></div>}</>}
  </div>;
}
