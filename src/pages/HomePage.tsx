import { ArrowRight, BookOpen, Check, Headphones, MapTrifold, Repeat, SlidersHorizontal, Waveform } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CourseCover } from "../components/CourseCover";
import { CourseCard } from "../components/CourseCard";
import { LegacyDailyPlan } from "../components/LegacyDailyPlan";
import { courses, courseById, courseTopics, uniqueCoursePhrases } from "../data/courses";
import { readers } from "../data/readers";
import { getDuePracticePhrases } from "../lib/coursePractice";
import { useCourseStore } from "../stores/courseStore";
import { calculateStreak, useActivityStore } from "../stores/activityStore";
import { useLearningPlanStore } from "../stores/learningPlanStore";
import { useReviewStore } from "../stores/reviewStore";
import { useLearningStore } from "../stores/learningStore";
import type { LearningGoal } from "../types/curriculum";

const goalNames: Record<LearningGoal, string> = { daily: "日常生活", work: "工作沟通", integration: "融入香港" };

function StudySettings({ unavailable }: { unavailable: boolean }) {
  const { profile, hydrated, saveProfile } = useLearningPlanStore();
  const [goal, setGoal] = useState<LearningGoal>(profile?.goal ?? "daily");
  const [minutes, setMinutes] = useState<10 | 20 | 30>(profile?.dailyMinutes ?? 20);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (profile) { setGoal(profile.goal); setMinutes(profile.dailyMinutes); }
  }, [profile]);
  return <details className="study-settings">
    <summary><SlidersHorizontal size={18} /> 学习偏好 <span>{hydrated && profile ? `${goalNames[profile.goal]} · 每天 ${profile.dailyMinutes} 分钟` : "未设置"}</span></summary>
    <div className="settings-content">
      {unavailable ? <p role="status">无法读取学习偏好，请刷新重试。</p> : !hydrated ? <p role="status">正在读取…</p> : <>
        <fieldset><legend>学习目标</legend><div className="segmented">{(Object.keys(goalNames) as LearningGoal[]).map(value => <button key={value} type="button" aria-pressed={goal === value} onClick={() => { setGoal(value); setSaved(false); }}>{goalNames[value]}</button>)}</div></fieldset>
        <fieldset><legend>每日时长</legend><div className="segmented">{([10, 20, 30] as const).map(value => <button key={value} type="button" aria-pressed={minutes === value} onClick={() => { setMinutes(value); setSaved(false); }}>{value} 分钟</button>)}</div></fieldset>
        <button type="button" className="button-primary" onClick={() => {
          setError("");
          void saveProfile({ goal, dailyMinutes: minutes }).then(() => setSaved(true)).catch(() => setError("未能保存，请重试。"));
        }}>{saved ? <><Check size={17} /> 已保存</> : "保存偏好"}</button>
        {error && <p role="alert">{error}</p>}
      </>}
    </div>
  </details>;
}

export function HomePage() {
  const { progress, bookmarks, phraseReviews, lastCourseId, hydrated, hydrate, storageError } = useCourseStore();
  const { dates, hydrated: activityHydrated, hydrate: hydrateActivity } = useActivityStore();
  const { profile, hydrate: hydrateProfile } = useLearningPlanStore();
  const { cards, hydrated: reviewHydrated, hydrate: hydrateReview, syncCompletedLessons } = useReviewStore();
  const { scenarioProgress, hydrated: learningHydrated, hydrate: hydrateLearning } = useLearningStore();
  const [activityError, setActivityError] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [legacyError, setLegacyError] = useState(false);
  useEffect(() => {
    void hydrate();
    void hydrateActivity().catch(() => setActivityError(true));
    void hydrateProfile().catch(() => setProfileError(true));
    void hydrateReview().catch(() => setLegacyError(true));
    void hydrateLearning().catch(() => setLegacyError(true));
  }, [hydrate, hydrateActivity, hydrateProfile, hydrateReview, hydrateLearning]);
  useEffect(() => {
    if (reviewHydrated && learningHydrated) void syncCompletedLessons(scenarioProgress).catch(() => setLegacyError(true));
  }, [scenarioProgress, reviewHydrated, learningHydrated, cards.length, syncCompletedLessons]);

  const completed = courses.filter(course => progress[course.id]?.completedAt).length;
  const previousCourse = lastCourseId ? courseById.get(lastCourseId) : undefined;
  const resume = previousCourse ?? courseById.get("first-words-hello") ?? courses[0];
  const resumeProgress = resume ? progress[resume.id] : undefined;
  const answered = resume?.exercises.filter(exercise => Boolean(resumeProgress?.answers[exercise.id])).length ?? 0;
  const resumeHref = resume ? `/courses/${resume.id}${resumeProgress?.section ? `#${resumeProgress.section}` : ""}` : "/scenarios";
  const featured = ["food-drink", "getting-around", "friends"].map(topic => courses.find(course => course.topicId === topic)).filter(course => course !== undefined);
  const featuredReaders = [readers[0], readers[2], readers[7]].filter(reader => reader !== undefined);
  const due = cards.filter(card => new Date(card.due).getTime() <= Date.now()).length;
  const dailyMinutes = profile?.dailyMinutes ?? 20;

  const dueSavedPhrases = useMemo(
    () => getDuePracticePhrases(progress, bookmarks, phraseReviews, "saved", new Date(), { dailyMinutes }).length,
    [progress, bookmarks, phraseReviews, dailyMinutes],
  );
  const dueLearnedPhrases = useMemo(
    () => getDuePracticePhrases(progress, bookmarks, phraseReviews, "learned", new Date(), { dailyMinutes }).length,
    [progress, bookmarks, phraseReviews, dailyMinutes],
  );
  const reviewHref = dueSavedPhrases > 0
    ? "/review?source=saved"
    : dueLearnedPhrases > 0
      ? "/review?source=learned"
      : bookmarks.length > 0
        ? "/review?source=saved"
        : reviewHydrated && due > 0
          ? "/review?tab=legacy"
          : "/review";
  const reviewLabel = dueSavedPhrases > 0
    ? `温习 ${dueSavedPhrases} 句收藏到期`
    : dueLearnedPhrases > 0
      ? `温习 ${dueLearnedPhrases} 句课程到期`
      : bookmarks.length > 0
        ? `温习 ${bookmarks.length} 句收藏`
        : reviewHydrated && due > 0
          ? `${due} 张待温习词卡`
          : "温习";

  return <div className="home-page page-enter">
    <section className="welcome-hero">
      <div className="welcome-copy">
        <h1>学粤语</h1>
        <Link className="button-primary" to="/scenarios">全部课程 <ArrowRight size={18} /></Link>
        <Link className="hero-expression-link text-link" to="/expressions">常用表达 <ArrowRight size={16} /></Link>
        <div className="hero-footnote"><span>{courses.length} 节课程</span><span>{readers.length} 篇短读</span><span>{uniqueCoursePhrases} 句表达</span></div>
      </div>
      <div className="hero-art"><CourseCover scene={1} label="香港街道与电车插画" /></div>
    </section>
    {(storageError || activityError) && <p role="status">{storageError || "无法读取连续学习记录，请刷新重试。"}</p>}
    <section className="today-strip" aria-label="继续学习">
      <div className="today-main">
        <span className="icon-tile"><BookOpen size={23} /></span>
        <div>
          <p className="small-label">{previousCourse ? "继续学习" : "第一课"}</p>
          <h2>{hydrated ? resume?.title ?? "课程" : "正在读取…"}</h2>
          {hydrated && resume && <p>{resume.phrases.length} 句表达 · {resume.minutes} 分钟{resumeProgress?.completedAt ? " · 已学完" : answered > 0 ? ` · 已答 ${answered}/${resume.exercises.length} 题` : ""}</p>}
        </div>
        {hydrated && <Link className="button-primary" to={resumeHref}>{resumeProgress?.completedAt ? "复习" : previousCourse ? "继续学习" : "开始学习"}<ArrowRight size={17} /></Link>}
      </div>
      <div className="today-stats">
        <div><strong>{hydrated ? completed : "…"}</strong><span>已完成课程</span></div>
        <div><strong>{activityHydrated ? calculateStreak(dates) : "…"}</strong><span>连续学习天数</span></div>
        <Link to={hydrated ? reviewHref : "/review"}><Repeat size={18} /><span>{hydrated ? reviewLabel : "温习"}</span><ArrowRight size={15} /></Link>
      </div>
    </section>
    <section className="home-discover">
      <div className="section-heading"><h2>主题课程</h2><Link className="text-link" to="/scenarios">全部 {courseTopics.length} 个主题 <ArrowRight size={17} /></Link></div>
      <div className="topic-shortcuts">{courseTopics.slice(0, 6).map(topic => <Link key={topic.id} to={`/scenarios?topic=${topic.id}`}><CourseCover scene={topic.scene} /><div><h3>{topic.name}</h3><p>{courses.filter(course => course.topicId === topic.id).length} 节课程</p></div><ArrowRight size={17} /></Link>)}</div>
    </section>
    <section className="home-featured">
      <div className="section-heading"><h2>精选课程</h2><Link className="text-link" to="/scenarios">全部课程 <ArrowRight size={17} /></Link></div>
      <div className="featured-grid">{featured.map(course => <CourseCard key={course.id} course={course} />)}</div>
    </section>
    <section className="home-reading">
      <div className="section-heading"><h2>生活短读</h2><Link className="text-link" to="/readers">全部 {readers.length} 篇 <ArrowRight size={17} /></Link></div>
      <div className="home-reader-list">{featuredReaders.map(reader => <Link key={reader.id} to={`/readers/${reader.id}`}><span className="small-label">{courseTopics.find(topic => topic.id === reader.topicId)?.name} · L{reader.level} · {reader.minutes} 分钟</span><h3>{reader.title}</h3><span>阅读 <ArrowRight size={16} /></span></Link>)}</div>
    </section>
    <section className="foundation-banner"><span className="icon-tile"><Headphones size={27} /></span><div><h2>声调练习</h2><p>六声 · 粤拼 · 听辨 · 跟读</p></div><Link to="/tones" className="button-outline"><Waveform size={18} /> 开始练习 <ArrowRight size={17} /></Link></section>
    <div className="home-bottom"><StudySettings unavailable={profileError} /><Link className="text-link" to="/path"><MapTrifold size={18} /> 分级课程 <ArrowRight size={17} /></Link></div>
    {legacyError ? <p role="status">无法读取分级学习计划，请刷新重试。</p> : reviewHydrated && learningHydrated ? <LegacyDailyPlan /> : <p role="status">正在读取练习计划…</p>}
  </div>;
}
