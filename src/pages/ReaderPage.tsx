import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle, Clock, Lightbulb } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { topicById } from "../data/courses";
import { readerById, readers } from "../data/readers";
import { useReaderStore } from "../stores/readerStore";

export function ReaderPage() {
  const { readerId } = useParams<{ readerId: string }>();
  return <ReaderContent key={readerId} readerId={readerId ?? ""} />;
}

function ReaderContent({ readerId }: { readerId: string }) {
  const reader = readerById.get(readerId);
  const { progress, hydrated, hydrate, storageError, answerQuestion, completeReader } = useReaderStore();
  const [showJyutping, setShowJyutping] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void hydrate(); }, [hydrate]);

  if (!reader) return <div className="reader-page readers-empty"><BookOpen size={38} /><h1>未找到这篇短读</h1><Link className="button-primary" to="/readers">返回短读目录 <ArrowRight size={18} /></Link></div>;
  const topic = topicById.get(reader.topicId);
  const saved = progress[reader.id];
  const answers = saved?.answers ?? {};
  const answered = reader.questions.filter(question => Boolean(answers[question.id])).length;
  const correct = reader.questions.filter(question => answers[question.id] === question.answer).length;
  const next = readers[readers.findIndex(item => item.id === reader.id) + 1];
  const companions = readers.filter(item => item.topicId === reader.topicId && item.id !== reader.id);
  const finish = async () => { setSaving(true); try { await completeReader(reader.id); } finally { setSaving(false); } };

  return <div className="reader-page page-enter">
    <Link className="back-link" to={`/readers?topic=${reader.topicId}`}><ArrowLeft size={17} />返回生活短读</Link>
    <header className="reader-header"><p className="eyebrow">{topic?.name} <span className="level-badge">L{reader.level}</span></p><h1>{reader.title}</h1><p>{reader.description}</p><div className="reader-header-meta"><span><Clock size={16} />约 {reader.minutes} 分钟</span><span>{reader.paragraphs.length} 段正文</span><span>{reader.questions.length} 道理解题</span>{saved?.completedAt && <span className="reader-read-status"><CheckCircle size={17} weight="fill" />已读完</span>}</div></header>
    {storageError && <p role="status" className="storage-error">{storageError}</p>}
    {!hydrated ? <div className="reader-loading" role="status"><span className="sr-only">正在读取短读记录</span><span /><span /><span /><span /></div> : <div className="reader-layout">
      <aside className="reader-sidebar"><p className="small-label">本篇阅读</p><nav aria-label="短读目录"><a href="#reader-story">正文</a><a href="#reader-words">重点词组 <small>{reader.glossary.length}</small></a><a href="#reader-questions">理解练习 <small>{answered}/{reader.questions.length}</small></a></nav></aside>
      <div className="reader-body">
        <section id="reader-story" className="reader-section"><div className="reader-section-heading"><h2>正文</h2><div className="reading-toggles"><button type="button" aria-pressed={showJyutping} onClick={() => setShowJyutping(!showJyutping)}>粤拼 {showJyutping ? "开" : "关"}</button><button type="button" aria-pressed={showTranslation} onClick={() => setShowTranslation(!showTranslation)}>释义 {showTranslation ? "开" : "关"}</button></div></div><div className="reader-story-paper">{reader.paragraphs.map((paragraph, index) => <article className="reader-paragraph" key={`${reader.id}-${index}`}><div className="reader-paragraph-tools"><span>第 {index + 1} 段</span><CantoneseSpeakButton text={paragraph.hanzi} label="听这一段" /></div><p className="reader-hanzi" lang="zh-HK">{paragraph.hanzi}</p>{showJyutping && <p className="reader-jyutping">{paragraph.jyutping}</p>}{showTranslation && <p className="reader-translation">{paragraph.mandarin}</p>}</article>)}</div><div className="reader-takeaway"><Lightbulb size={23} /><div><h3>阅读提示</h3><p>{reader.takeaway}</p></div></div></section>
        <section id="reader-words" className="reader-section"><div className="reader-section-heading"><h2>重点词组</h2><span>{reader.glossary.length} 个</span></div><div className="reader-glossary">{reader.glossary.map(word => <article key={word.hanzi}><div><h3 lang="zh-HK">{word.hanzi}</h3><p className="reader-word-jyutping">{word.jyutping}</p><p>{word.mandarin}</p></div><CantoneseSpeakButton text={word.hanzi} label="听词组" /></article>)}</div></section>
        <section id="reader-questions" className="reader-section"><div className="reader-section-heading"><h2>理解练习</h2><span>{answered} / {reader.questions.length} 已作答</span></div><div className="reader-questions">{reader.questions.map((question, index) => {
          const choice = answers[question.id];
          const isCorrect = choice === question.answer;
          return <article key={question.id} className="reader-question"><p className="reader-question-number">理解题 {index + 1}</p><h3>{question.prompt}</h3><div className="reader-question-options">{question.options.map((option, optionIndex) => <button key={option} type="button" disabled={Boolean(choice)} className={choice ? option === question.answer ? "correct" : option === choice ? "incorrect" : "" : ""} onClick={() => { void answerQuestion(reader.id, question.id, option); }}><span>{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{choice && option === question.answer && <Check size={19} />}</button>)}</div>{choice && <div className={`reader-question-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status"><strong>{isCorrect ? "答对" : "答案不正确"}</strong><p>{question.explanation}</p><button type="button" onClick={() => { void answerQuestion(reader.id, question.id, ""); }}>重做这题</button></div>}</article>;
        })}</div><div className="reader-finish"><div><h3>{saved?.completedAt ? "已读完" : "阅读进度"}</h3><p>{answered === reader.questions.length ? `答对 ${correct} / ${reader.questions.length} 题` : `还剩 ${reader.questions.length - answered} 道理解题`}</p></div><button type="button" className="button-primary" disabled={answered < reader.questions.length || saving || Boolean(saved?.completedAt)} onClick={() => { void finish(); }}><CheckCircle size={19} />{saving ? "正在记录" : saved?.completedAt ? "已读完" : "标记为已读完"}</button></div></section>
        {companions.length > 0 && <section className="reader-companions"><h2>同主题短读</h2><div>{companions.map(item => <Link key={item.id} to={`/readers/${item.id}`}><span>L{item.level} · 约 {item.minutes} 分钟{progress[item.id]?.completedAt ? " · 已读完" : ""}</span><strong>{item.title}</strong><ArrowRight size={18} /></Link>)}</div></section>}
        <div className="reader-related"><Link to={`/scenarios?topic=${reader.topicId}`}><span>相关课程</span><strong>{topic?.name ?? "课程"}</strong><ArrowRight size={20} /></Link>{next && <Link to={`/readers/${next.id}`}><span>下一篇生活短读</span><strong>{next.title}</strong><ArrowRight size={20} /></Link>}</div>
      </div>
    </div>}
  </div>;
}
