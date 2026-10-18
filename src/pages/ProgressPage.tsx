import { ArrowRight, BookmarkSimple, BookOpen, Check, CheckCircle, Repeat, CaretDown } from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { courses, courseById, courseTopics } from "../data/courses";
import { readers } from "../data/readers";
import { getCourseMistakes } from "../lib/coursePractice";
import { calculateStreak, useActivityStore } from "../stores/activityStore";
import { useCourseStore } from "../stores/courseStore";
import { useReaderStore } from "../stores/readerStore";

const LegacyProgressDetails = lazy(() => import("../components/LegacyProgressDetails").then(module => ({ default: module.LegacyProgressDetails })));

export function ProgressPage() {
  const { progress, bookmarks, phraseReviews, hydrated, hydrate, storageError } = useCourseStore();
  const { dates, hydrate: hydrateActivity } = useActivityStore();
  const readerState = useReaderStore();
  const [showLegacy, setShowLegacy] = useState(false);
  const [activityError, setActivityError] = useState(false);
  useEffect(() => { void hydrate(); void hydrateActivity().catch(() => setActivityError(true)); void readerState.hydrate(); }, [hydrate, hydrateActivity, readerState.hydrate]);
  const completed = courses.filter(course => progress[course.id]?.completedAt);
  const encounteredWords = new Set(completed.flatMap(course => course.words.map(word => word.hanzi))).size;
  const recent = Object.entries(progress).filter(([id]) => courseById.has(id)).sort((a,b) => b[1].openedAt.localeCompare(a[1].openedAt)).slice(0,4);
  const mistakes = getCourseMistakes(progress);
  const reviewed = Object.keys(phraseReviews).length;
  // Reader progress is independent from lesson completion.
  const readerProgress = readerState.progress;
  const readCount = readers.filter(reader => readerProgress[reader.id]?.completedAt).length;
  return <div className="progress-page page-enter"><header className="journal-header"><div><h1>学习进度</h1></div><Link className="button-outline" to="/scenarios">浏览课程 <ArrowRight size={17} /></Link></header>
    {storageError && <p className="storage-error" role="status">{storageError}</p>}{activityError && <p className="storage-error" role="status">暂时未能读取连续学习记录，课程记录仍可查看。</p>}
    {!hydrated ? <div className="practice-loading" role="status">正在读取学习记录…</div> : <>
    <div className="learning-stats"><div><span className="small-label">已完成课程</span><strong>{completed.length}<small> / {courses.length}</small></strong></div><div><span className="small-label">已学课程词组</span><strong>{encounteredWords}</strong><span>按词组去重</span></div><div><span className="small-label">连续学习</span><strong>{calculateStreak(dates)}<small> 天</small></strong></div><Link to="/readers"><span className="small-label">生活短读</span><strong>{readCount}<small> / {readers.length}</small></strong><span>篇已读 <ArrowRight size={15} /></span></Link></div>
    <section className="progress-topic-section"><div className="section-heading"><div><h2>课程进度</h2></div><span className="small-label">{completed.length} / {courses.length} 节</span></div><div className="topic-progress-list">{courseTopics.map(topic => {
      const group = courses.filter(course => course.topicId === topic.id);
      const done = group.filter(course => progress[course.id]?.completedAt).length;
      return <article key={topic.id}><div className="topic-progress-heading"><Link to={`/scenarios?topic=${topic.id}`}>{topic.name} <ArrowRight size={15} /></Link><span>{done} / {group.length}</span></div><div className="lesson-stamps">{group.map((course,index) => <Link key={course.id} className={progress[course.id]?.completedAt ? "done" : progress[course.id] ? "started" : ""} to={`/courses/${course.id}`} aria-label={`${course.title}，${progress[course.id]?.completedAt ? "已学完" : progress[course.id] ? "已打开" : "未开始"}`}>{progress[course.id]?.completedAt ? <Check size={17} /> : String(index + 1).padStart(2,"0")}</Link>)}</div></article>;
    })}</div><p className="practice-local-note">✓ 已学完 · 蓝色边框：学习中</p></section>
    <div className="progress-lower-grid"><section><div className="section-heading"><div><h2>最近学习</h2></div></div>{recent.length > 0 ? <div className="recent-course-list">{recent.map(([id,item]) => { const course = courseById.get(id)!; return <Link key={id} to={`/courses/${id}${item.section ? `#${item.section}` : ""}`}><span className="recent-course-icon">{item.completedAt ? <CheckCircle size={21} /> : <BookOpen size={21} />}</span><div><h3>{course.title}</h3><p>{item.completedAt ? "已学完" : `已作答 ${Object.values(item.answers).filter(Boolean).length} / ${course.exercises.length} 题`}</p></div><ArrowRight size={17} /></Link>; })}</div> : <div className="progress-quiet-empty"><BookOpen size={27} /><p>还没有学习记录</p><Link className="text-link" to="/courses/cafe-order">学习点餐课程 <ArrowRight size={16} /></Link></div>}</section>
    <section className="pocket-progress"><div className="section-heading"><div><h2>收藏与温习</h2></div></div><Link to="/saved"><BookmarkSimple size={22} /><div><strong>{bookmarks.length} 条收藏表达</strong></div><ArrowRight size={16} /></Link><Link to="/review"><Repeat size={22} /><div><strong>已温习 {reviewed} 句表达</strong></div><ArrowRight size={16} /></Link><Link to="/review?tab=mistakes"><CheckCircle size={22} /><div><strong>{mistakes.length} 道题待订正</strong></div><ArrowRight size={16} /></Link></section></div>
    </>}
    <details className="legacy-progress-panel" onToggle={event => setShowLegacy(event.currentTarget.open)}><summary><span><strong>基础课程与声调记录</strong><span>五级能力、六个情境课及辨调统计</span></span><CaretDown size={19} /></summary>{showLegacy && <Suspense fallback={<p role="status">正在读取基础课程记录…</p>}><LegacyProgressDetails /></Suspense>}</details><p className="progress-storage-note">所有记录仅保存在当前浏览器或设备，清除网站数据后会移除。</p>
  </div>;
}
