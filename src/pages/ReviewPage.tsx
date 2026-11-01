import { ArrowRight, BookmarkSimple, Check, CheckCircle, Repeat, ArrowCounterClockwise } from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { InteractivePracticePanel } from "../components/InteractivePracticePanel";
import { courses, courseById } from "../data/courses";
import {
  getCourseMistakes,
  getDailyNewPhraseLimit,
  getDuePracticePhrases,
  getPracticePhrases,
  previewPhraseIntervalLabel,
  sortPracticePhrasesByFSRS,
} from "../lib/coursePractice";
import { useCourseStore } from "../stores/courseStore";
import { useLearningPlanStore } from "../stores/learningPlanStore";
import type { ReviewRating } from "../types/domain";

const LegacyWordReview = lazy(() => import("../components/LegacyWordReview").then(module => ({ default: module.LegacyWordReview })));
type PracticePhrase = ReturnType<typeof getPracticePhrases>[number];

function ExpressionPractice({ deck, source }: { deck: PracticePhrase[]; source: "saved" | "learned" }) {
  const [queue, setQueue] = useState<PracticePhrase[]>(() => deck.slice(0, 10));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [retry, setRetry] = useState<PracticePhrase[]>([]);
  const [offset, setOffset] = useState(0);
  const phraseReviews = useCourseStore(state => state.phraseReviews);
  const recordReview = useCourseStore(state => state.recordPhraseReview);
  const current = queue[position];
  const start = (items: PracticePhrase[]) => { setQueue(items.slice(0, 10)); setPosition(0); setRevealed(false); setRemembered(0); setRetry([]); };
  const nextGroup = () => { const nextOffset = offset + 10 < deck.length ? offset + 10 : 0; setOffset(nextOffset); start(deck.slice(nextOffset, nextOffset + 10)); };

  const rate = (rating: ReviewRating) => {
    if (!current) return;
    void recordReview(current.phrase.id, rating);
    if (rating !== "again") setRemembered(value => value + 1);
    else setRetry(items => [...items, current]);
    setRevealed(false);
    setPosition(value => value + 1);
  };

  if (deck.length === 0) return <div className="practice-empty"><BookmarkSimple size={32} /><h2>{source === "saved" ? "暂无收藏表达" : "还没有学完的课程"}</h2><Link to="/scenarios" className="button-primary">浏览课程 <ArrowRight size={17} /></Link></div>;
  if (!current) return <div className="practice-complete"><CheckCircle size={38} /><h2>本组完成</h2><p>本组共 {queue.length} 句，已排入 FSRS 间隔计划 {remembered} 句，需重练 {retry.length} 句。</p><div className="practice-complete-actions">{retry.length > 0 && <button className="button-primary" onClick={() => start(retry)}><Repeat size={18} /> 再练这 {retry.length} 句</button>}<button className="button-outline" onClick={nextGroup}><ArrowCounterClockwise size={17} /> 下一组</button><Link className="text-link" to="/saved">查看收藏 <ArrowRight size={16} /></Link></div></div>;

  const previousRecord = phraseReviews[current.phrase.id];
  const ratingOptions: { rating: ReviewRating; label: string; className: string }[] = [
    { rating: "again", label: "需要再练", className: "button-outline rating-again" },
    { rating: "hard", label: "有点吃力", className: "button-outline rating-hard" },
    { rating: "good", label: "记得", className: "button-primary rating-good" },
    { rating: "easy", label: "非常熟练", className: "button-outline rating-easy" },
  ];

  return <div className="expression-practice">
    <div className="practice-session-heading"><span>本组 {position + 1} / {queue.length}</span><Link to={`/courses/${current.course.id}#${current.phrase.id}`}>{current.course.title} <ArrowRight size={14} /></Link></div>
    <div className="practice-session-track" aria-label={`已回想 ${position} / ${queue.length} 句`}><span style={{ width: `${position / queue.length * 100}%` }} /></div>
    <article className="recall-paper"><p className="small-label">用粤语说出这句话（FSRS 间隔记忆）</p><h2>{current.phrase.mandarin}</h2>
      {revealed ? <div className="recall-answer" aria-live="polite"><h3>{current.phrase.hanzi}</h3><p className="jyutping">{current.phrase.jyutping}</p>{current.phrase.note && <p>{current.phrase.note}</p>}<CantoneseSpeakButton text={current.phrase.hanzi} audio={current.phrase.audio} label="听示范" /></div> : <p className="recall-hint" aria-hidden="true" />}
      <div className="recall-controls">
        {revealed ? (
          <div className="fsrs-rating-grid">
            {ratingOptions.map(opt => (
              <button key={opt.rating} type="button" className={opt.className} onClick={() => rate(opt.rating)}>
                <span>{opt.label}</span>
                <small>{previewPhraseIntervalLabel(current.phrase.id, previousRecord, opt.rating)}</small>
              </button>
            ))}
          </div>
        ) : (
          <button className="button-primary" onClick={() => setRevealed(true)}>查看答案</button>
        )}
      </div>
    </article>
  </div>;
}

function MistakePractice() {
  const { progress, answerExercise } = useCourseStore();
  const mistakes = getCourseMistakes(progress);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  return <div className="mistake-practice">{mistakes.length > 0 ? <><div className="section-heading"><div><h2>错题订正</h2><p className="small-label">{mistakes.length} 道课程练习待订正</p></div></div><div className="exercise-stack">{mistakes.map(({ course, exercise, answer }) => {
    const choice = corrections[exercise.id];
    return <article className="exercise-block" key={exercise.id}><Link className="text-link" to={`/courses/${course.id}#practice`}>{course.title} <ArrowRight size={14} /></Link><h3>{exercise.prompt}</h3><p className="mistake-previous">上次选择：{answer}</p><div className="exercise-options">{exercise.options.map((option,index) => <button type="button" key={option} disabled={Boolean(choice)} className={choice ? option === exercise.answer ? "correct" : option === choice ? "incorrect" : "" : ""} onClick={() => setCorrections(values => ({ ...values, [exercise.id]: option }))}><span>{String.fromCharCode(65 + index)}</span>{option}{choice && option === exercise.answer && <Check size={18} />}</button>)}</div>{choice && <div className="exercise-feedback" role="status"><strong>{choice === exercise.answer ? "答对" : "答案不正确"}</strong><p>{exercise.explanation}</p>{choice === exercise.answer ? <button type="button" onClick={() => void answerExercise(course.id, exercise.id, exercise.answer)}>记录订正，移出错题</button> : <button type="button" onClick={() => setCorrections(values => ({...values, [exercise.id]: ""}))}>再试一次</button>}</div>}</article>;
  })}</div></> : <div className="practice-empty"><CheckCircle size={35} /><h2>目前没有待订正的课内错题</h2><Link to="/scenarios" className="button-outline">浏览课程 <ArrowRight size={16} /></Link></div>}</div>;
}

function DrillsPractice({ defaultCourseId }: { defaultCourseId: string }) {
  const [selectedId, setSelectedId] = useState(defaultCourseId);
  const course = courseById.get(selectedId) ?? courses[0]!;
  return (
    <div className="drills-practice">
      <div className="drills-course-picker">
        <label htmlFor="drill-course-select" className="small-label">选择练习课程：</label>
        <select
          id="drill-course-select"
          value={course.id}
          onChange={e => setSelectedId(e.target.value)}
        >
          {courses.map(item => (
            <option key={item.id} value={item.id}>
              L{item.level} · {item.title}
            </option>
          ))}
        </select>
        <Link to={`/courses/${course.id}`} className="text-link">
          打开原课 <ArrowRight size={15} />
        </Link>
      </div>
      <InteractivePracticePanel key={course.id} course={course} />
    </div>
  );
}

export function ReviewPage() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab = rawTab === "mistakes" ? "mistakes" : rawTab === "legacy" ? "legacy" : rawTab === "drills" ? "drills" : "expressions";
  const paramSource = params.get("source");
  const { progress, bookmarks, lastCourseId, phraseReviews, hydrated, hydrate, storageError } = useCourseStore();
  const { profile, hydrate: hydrateProfile } = useLearningPlanStore();
  const [manualSource, setManualSource] = useState<"saved" | "learned" | null>(null);
  const [onlyDue, setOnlyDue] = useState(true);
  useEffect(() => {
    void hydrate();
    void hydrateProfile().catch(() => undefined);
  }, [hydrate, hydrateProfile]);

  const hasCompletedCourses = useMemo(
    () => courses.some(c => Boolean(progress[c.id]?.completedAt)),
    [progress],
  );
  const source: "saved" | "learned" = manualSource
    ?? (paramSource === "learned" ? "learned" : paramSource === "saved" ? "saved" : (bookmarks.length === 0 && hasCompletedCourses ? "learned" : "saved"));

  const [practiceRound, setPracticeRound] = useState(0);
  const [session, setSession] = useState<{ source: "saved" | "learned"; deck: PracticePhrase[] } | null>(null);
  const dailyMinutes = profile?.dailyMinutes ?? 20;

  const allInScope = useMemo(
    () => sortPracticePhrasesByFSRS(getPracticePhrases(progress, bookmarks, source), phraseReviews),
    [progress, bookmarks, source, phraseReviews],
  );
  const dueInScope = useMemo(
    () => getDuePracticePhrases(progress, bookmarks, phraseReviews, source, new Date(), { dailyMinutes }),
    [progress, bookmarks, phraseReviews, source, dailyMinutes],
  );
  const dueSavedCount = useMemo(
    () => getDuePracticePhrases(progress, bookmarks, phraseReviews, "saved", new Date(), { dailyMinutes }).length,
    [progress, bookmarks, phraseReviews, dailyMinutes],
  );
  const dueLearnedCount = useMemo(
    () => getDuePracticePhrases(progress, bookmarks, phraseReviews, "learned", new Date(), { dailyMinutes }).length,
    [progress, bookmarks, phraseReviews, dailyMinutes],
  );
  const deck = onlyDue && dueInScope.length > 0 ? dueInScope : allInScope;

  const mistakes = getCourseMistakes(progress);
  const chooseSource = (value: "saved" | "learned") => {
    setManualSource(value);
    setSession(null);
  };
  const defaultDrillCourse = lastCourseId && courseById.has(lastCourseId) ? lastCourseId : courses[0]!.id;

  return <div className="practice-page page-enter"><header className="journal-header"><div><h1>温习</h1></div></header>
    <nav className="practice-tabs" aria-label="温习内容">
      {[
        { id: "expressions", label: `表达回想${dueInScope.length ? ` · ${dueInScope.length} 到期` : ""}` },
        { id: "drills", label: "盲听与造句" },
        { id: "mistakes", label: `课内错题${mistakes.length ? ` · ${mistakes.length}` : ""}` },
        { id: "legacy", label: "词卡温习" },
      ].map(item => (
        <button
          type="button"
          key={item.id}
          aria-current={tab === item.id ? "page" : undefined}
          onClick={() => setParams(item.id === "expressions" ? {} : { tab: item.id })}
        >
          {item.label}
        </button>
      ))}
    </nav>
    {storageError && <p role="status" className="storage-error">{storageError}</p>}
    {!hydrated ? (
      <div className="practice-loading" role="status">正在读取温习记录…</div>
    ) : tab === "legacy" ? (
      <Suspense fallback={<p role="status">正在读取词卡…</p>}><div className="legacy-review"><LegacyWordReview /></div></Suspense>
    ) : tab === "mistakes" ? (
      <MistakePractice />
    ) : tab === "drills" ? (
      <DrillsPractice defaultCourseId={defaultDrillCourse} />
    ) : (
      <>
        <div className="recall-toolbar">
          <div className="segmented">
            <button type="button" aria-pressed={source === "saved"} onClick={() => chooseSource("saved")}>
              我的收藏{dueSavedCount > 0 ? ` (${dueSavedCount})` : ""}
            </button>
            <button type="button" aria-pressed={source === "learned"} onClick={() => chooseSource("learned")}>
              已完成课程{dueLearnedCount > 0 ? ` (${dueLearnedCount})` : ""}
            </button>
          </div>
          {allInScope.length > 0 && (
            <label className="unfinished-filter">
              <input
                type="checkbox"
                checked={onlyDue}
                onChange={e => { setOnlyDue(e.target.checked); setSession(null); }}
              />
              只看今日计划 ({dueInScope.length})
            </label>
          )}
          <Link to="/saved" className="text-link">管理收藏 <ArrowRight size={16} /></Link>
        </div>
        {session ? (
          <div>
            <div className="practice-restart"><button className="text-link" onClick={() => setSession(null)}>重新选择范围</button></div>
            <ExpressionPractice key={practiceRound} source={session.source} deck={session.deck} />
          </div>
        ) : allInScope.length === 0 ? (
          <ExpressionPractice key={source} deck={[]} source={source} />
        ) : (
          <div className="practice-start">
            <div>
              <p className="small-label">
                {source === "saved" ? "收藏表达 · FSRS 排程" : "已完成课程的表达 · FSRS 排程"}（每日新句上限 {getDailyNewPhraseLimit(dailyMinutes)} 句）
              </p>
              <h2>{dueInScope.length > 0 ? `今日待温习 ${dueInScope.length} 句（库内共 ${allInScope.length} 句）` : `今日计划已完成（库内共 ${allInScope.length} 句）`}</h2>
            </div>
            <button
              className="button-primary"
              onClick={() => {
                setSession({ source, deck });
                setPracticeRound(value => value + 1);
              }}
            >
              {dueInScope.length > 0 ? "开始今日温习" : "提前温习一轮"} <ArrowRight size={17} />
            </button>
          </div>
        )}
      </>
    )}
  </div>;
}
