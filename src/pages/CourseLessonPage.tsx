import { ArrowLeft, ArrowRight, BookmarkSimple, Check, CheckCircle, Clock, Lightbulb, Microphone, SpeakerHigh } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { CourseCover } from "../components/CourseCover";
import { courseById, courses, topicById } from "../data/courses";
import { sentences } from "../data";
import { useCourseStore } from "../stores/courseStore";
import type { CoursePhrase } from "../types/course";

const sections = [{ id: "dialogue", name: "场景对话" }, { id: "expressions", name: "重点词组" }, { id: "patterns", name: "句型用法" }, { id: "practice", name: "课后练习" }, { id: "speaking", name: "口语练习" }];
const staticAudio = new Map(sentences.map(sentence => [sentence.hanzi.replace(/[\s，。！？、；：]/g, ""), sentence.audio]));
const audioFor = (phrase: CoursePhrase) => phrase.audio ?? staticAudio.get(phrase.hanzi.replace(/[\s，。！？、；：]/g, ""));

export function CourseLessonPage() {
  const { courseId } = useParams<{ courseId: string }>();
  return <LessonContent key={courseId} courseId={courseId ?? ""} />;
}

function LessonContent({ courseId }: { courseId: string }) {
  const course = courseById.get(courseId);
  const { hash } = useLocation();
  const { progress, bookmarks, hydrated, hydrate, openCourse, setSection, answerExercise, completeCourse, toggleBookmark, storageError } = useCourseStore();
  const [showTranslation, setShowTranslation] = useState(true);
  const [showJyutping, setShowJyutping] = useState(true);
  const [activeSection, setActiveSection] = useState(() => sections.some(section => `#${section.id}` === hash) ? hash.slice(1) : "dialogue");
  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { if (hydrated && course) openCourse(course.id); }, [hydrated, course, openCourse]);
  useEffect(() => { if (hash && hydrated) { const element = document.getElementById(hash.slice(1)); element?.scrollIntoView(); } }, [hash, hydrated]);
  if (!course) return <div className="not-found"><BookMissing /><h1>未找到这节课程</h1><p>请返回课程库选择其他课程。</p><Link className="button-primary" to="/scenarios">返回课程库 <ArrowRight size={18} /></Link></div>;
  const topic = topicById.get(course.topicId);
  const saved = progress[course.id];
  const answers = saved?.answers ?? {};
  const answered = course.exercises.filter(exercise => Boolean(answers[exercise.id])).length;
  const correct = course.exercises.filter(exercise => answers[exercise.id] === exercise.answer).length;
  const nextInTopic = courses.filter(item => item.topicId === course.topicId);
  const next = nextInTopic[nextInTopic.findIndex(item => item.id === course.id) + 1];
  const renderPhrase = (phrase: CoursePhrase, index: number, dialogue = false) => <article key={phrase.id} id={phrase.id} className={`phrase-row ${dialogue ? "dialogue-row" : "expression-row"}`}><div className="phrase-speaker">{dialogue ? <><span className={`speaker-avatar speaker-${index % 2}`}>{course.speakers[index % 2]?.slice(0, 1)}</span><span>{course.speakers[index % 2]}</span></> : <span className="phrase-number">{String(index + 1).padStart(2, "0")}</span>}</div><div className="phrase-text"><h3>{phrase.hanzi}</h3>{showJyutping && <p className="jyutping">{phrase.jyutping}</p>}{showTranslation && <p className="phrase-translation">{phrase.mandarin}</p>}{phrase.note && <p className="phrase-note">{phrase.note}</p>}</div><div className="phrase-actions"><CantoneseSpeakButton text={phrase.hanzi} audio={audioFor(phrase)} label="听示范" /><button type="button" className="bookmark-button" aria-label={bookmarks.includes(phrase.id) ? `取消收藏：${phrase.hanzi}` : `收藏：${phrase.hanzi}`} aria-pressed={bookmarks.includes(phrase.id)} onClick={() => toggleBookmark(phrase.id)}><BookmarkSimple size={20} weight={bookmarks.includes(phrase.id) ? "fill" : "regular"} /></button></div></article>;
  return <div className="lesson-page page-enter"><Link to={`/scenarios?topic=${course.topicId}`} className="back-link"><ArrowLeft size={17} /> {topic?.name} · 返回课程</Link><header className="lesson-header"><div><p className="eyebrow">{topic?.name} <span className="level-badge">L{course.level}</span></p><h1>{course.title}</h1><p>{course.description}</p><div className="lesson-meta"><span><Clock size={16} /> 约 {course.minutes} 分钟</span><span>{course.phrases.length} 条表达</span><span>{course.words.length} 个词组</span><span>{course.exercises.length} 道练习</span>{saved?.completedAt && <span className="lesson-done"><CheckCircle weight="fill" size={17} /> 已学完</span>}</div></div><CourseCover scene={topic?.scene ?? 0} label={`${topic?.name}场景插画`} /></header>
    {storageError && <p role="status" className="storage-error">{storageError}</p>}
    <div className="lesson-layout"><aside className="lesson-sidebar"><p className="small-label">课程目录</p><nav aria-label="本课目录">{sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className={activeSection === section.id ? "active" : ""} onClick={() => { setActiveSection(section.id); setSection(course.id, section.id); }}><span>{String(index + 1).padStart(2, "0")}</span>{section.name}{section.id === "practice" && <small>{answered}/{course.exercises.length}</small>}</a>)}</nav></aside>
    <div className="lesson-content"><section id="dialogue" className="lesson-section"><div className="lesson-section-heading"><div><h2>场景对话</h2></div><div className="reading-toggles"><button type="button" aria-pressed={showJyutping} onClick={() => setShowJyutping(!showJyutping)}>粤拼 {showJyutping ? "开" : "关"}</button><button type="button" aria-pressed={showTranslation} onClick={() => setShowTranslation(!showTranslation)}>释义 {showTranslation ? "开" : "关"}</button></div></div><div className="dialogue-paper">{course.phrases.slice(0, course.dialogueLength).map((phrase, index) => renderPhrase(phrase, index, true))}</div><div className="culture-note"><Lightbulb size={22} /><div><strong>场景提示</strong><p>{course.cultureNote}</p></div></div></section>
    <section id="expressions" className="lesson-section"><div className="lesson-section-heading"><div><h2>重点词组</h2></div></div><div className="vocabulary-grid">{course.words.map(word => <div className="vocabulary-word" key={word.hanzi}><div><strong>{word.hanzi}</strong><p className="jyutping">{word.jyutping}</p><p>{word.mandarin}</p></div><CantoneseSpeakButton text={word.hanzi} label="听词语" /></div>)}</div>{course.phrases.length > course.dialogueLength && <div className="extra-expressions">{course.phrases.slice(course.dialogueLength).map((phrase, index) => renderPhrase(phrase, index + course.dialogueLength))}</div>}</section>
    <section id="patterns" className="lesson-section"><div className="lesson-section-heading"><div><h2>句型用法</h2></div></div><div className="pattern-stack">{course.patterns.map((pattern, index) => <article key={pattern.form} className="pattern-block"><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{pattern.form}</h3><p>{pattern.explanation}</p><blockquote>{pattern.example}</blockquote><CantoneseSpeakButton text={pattern.example} label="听例句" /></div></article>)}</div></section>
    <section id="practice" className="lesson-section"><div className="lesson-section-heading"><div><h2>课后练习</h2></div><span className="practice-count">{answered} / {course.exercises.length} 已作答</span></div><div className="exercise-stack">{course.exercises.map((exercise, index) => { const choice = answers[exercise.id]; const isCorrect = choice === exercise.answer; return <article className="exercise-block" key={exercise.id}><div className="exercise-label"><span>练习 {index + 1}</span><span>{exercise.kind === "meaning" ? "理解句意" : "对话应答"}</span></div><h3>{exercise.prompt}</h3><div className="exercise-options">{exercise.options.map((option, optionIndex) => <button type="button" key={option} disabled={Boolean(choice)} className={choice ? option === exercise.answer ? "correct" : option === choice ? "incorrect" : "" : ""} onClick={() => answerExercise(course.id, exercise.id, option)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{choice && option === exercise.answer && <Check size={18} />}</button>)}</div>{choice && <div className={`exercise-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status"><strong>{isCorrect ? "答对" : "答案不正确"}</strong><p>{exercise.explanation}</p><button type="button" onClick={() => answerExercise(course.id, exercise.id, "")}>重做这题</button></div>}</article>; })}</div></section>
    <section id="speaking" className="lesson-section speaking-section"><div className="lesson-section-heading"><div><h2>口语练习</h2></div><Microphone size={25} /></div><p className="speaking-prompt">{course.practicePrompt}</p><VoiceRecorder onRecorded={() => undefined} /><div className="finish-course"><div><h3>{saved?.completedAt ? "已完成本课" : "本课进度"}</h3><p>{answered === course.exercises.length ? `答对 ${correct} / ${course.exercises.length} 题` : `完成 ${course.exercises.length} 道课后练习后，可标记为学完。`}</p></div><button type="button" className="button-primary" disabled={answered < course.exercises.length} onClick={() => completeCourse(course.id)}><CheckCircle size={19} /> {saved?.completedAt ? "已学完" : "学完这一课"}</button></div>{saved?.completedAt && <Link className="next-course" to={next ? `/courses/${next.id}` : `/scenarios?topic=${course.topicId}`}><div><span>{next ? "同主题下一课" : "查看同主题课程"}</span><strong>{next?.title ?? topic?.name}</strong></div><ArrowRight size={22} /></Link>}</section>
    </div></div></div>;
}
function BookMissing() { return <SpeakerHigh size={35} />; }
