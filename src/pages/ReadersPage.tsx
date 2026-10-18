import { ArrowRight, BookOpen, CheckCircle, Clock, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LearningLibraryNav } from "../components/LearningLibraryNav";
import { courseTopics, topicById } from "../data/courses";
import { readers } from "../data/readers";
import { useReaderStore } from "../stores/readerStore";

export function ReadersPage() {
  const [params, setParams] = useSearchParams();
  const requestedTopic = params.get("topic");
  const topic = courseTopics.find(item => item.id === requestedTopic);
  const selected = topic?.id ?? "all";
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [batch, setBatch] = useState({ key: "", size: 12 });
  const { progress, hydrated, hydrate, storageError } = useReaderStore();
  useEffect(() => { void hydrate(); }, [hydrate]);
  const visible = useMemo(() => readers.filter(reader =>
    (selected === "all" || reader.topicId === selected)
    && (level === "all" || reader.level === Number(level))
    && (!unreadOnly || !progress[reader.id]?.completedAt)
    && `${reader.title}${reader.description}${topicById.get(reader.topicId)?.name ?? ""}${reader.paragraphs.map(paragraph => `${paragraph.hanzi}${paragraph.mandarin}`).join("")}`.toLowerCase().includes(query.trim().toLowerCase())),
  [selected, level, unreadOnly, progress, query]);
  const completed = readers.filter(reader => progress[reader.id]?.completedAt).length;
  const filterKey = JSON.stringify([selected, level, unreadOnly, query]);
  useEffect(() => { setBatch({ key: filterKey, size: 12 }); }, [filterKey]);
  const shownCount = batch.key === filterKey ? batch.size : 12;
  const clear = () => { setParams({}); setQuery(""); setLevel("all"); setUnreadOnly(false); };

  return <div className="readers-page page-enter">
    <LearningLibraryNav />
    <header className="readers-intro">
      <h1>生活短读</h1>

      <div className="readers-intro-meta"><span><BookOpen size={18} /> {readers.length} 篇生活短读</span><span>{hydrated ? `已读完 ${completed} 篇` : "正在读取本机记录"}</span></div>
    </header>
    {storageError && <p className="storage-error" role="status">{storageError}</p>}
    <div className="readers-browse">
      <aside className="readers-topics"><p className="small-label">主题</p><nav aria-label="短读主题"><button type="button" aria-current={selected === "all" ? "page" : undefined} onClick={() => setParams({})}>全部短读 <span>{readers.length}</span></button>{courseTopics.map(item => <button key={item.id} type="button" aria-current={selected === item.id ? "page" : undefined} onClick={() => setParams({ topic: item.id })}>{item.name}<span>{readers.filter(reader => reader.topicId === item.id).length}</span></button>)}</nav></aside>
      <section className="readers-main" aria-label="短读目录">
        <div className="readers-tools"><label className="search-box"><MagnifyingGlass size={20} /><input aria-label="搜索短读" placeholder="搜索故事、原文或中文释义" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="清空短读搜索" onClick={() => setQuery("")}><X size={18} /></button>}</label><label className="level-select"><span className="sr-only">短读难度</span><select aria-label="短读难度" value={level} onChange={event => setLevel(event.target.value)}><option value="all">全部难度</option><option value="1">L1 · 起步阅读</option><option value="2">L2 · 读懂日常</option><option value="3">L3 · 连贯理解</option></select></label><label className="readers-unread"><input type="checkbox" checked={unreadOnly} disabled={!hydrated} onChange={event => setUnreadOnly(event.target.checked)} />只看未读完</label></div>
        <div className="readers-list-heading"><h2>{topic?.name ?? "全部短读"}</h2><span>{visible.length} 篇</span></div>
        {!hydrated ? <div className="readers-loading" role="status" aria-label="正在载入短读记录"><span className="sr-only">正在载入短读记录</span>{[1, 2, 3].map(item => <div key={item}><span /><span /><span /></div>)}</div>
          : visible.length > 0 ? <><div className="readers-list">{visible.slice(0, shownCount).map(reader => <Link className="reader-entry" to={`/readers/${reader.id}`} key={reader.id}><div className="reader-entry-index" aria-hidden="true">{String(readers.findIndex(item => item.id === reader.id) + 1).padStart(2, "0")}</div><div className="reader-entry-copy"><div className="reader-entry-meta"><span>{topicById.get(reader.topicId)?.name}</span><span>L{reader.level}</span><span><Clock size={14} />约 {reader.minutes} 分钟</span></div><h3>{reader.title}</h3><p>{reader.description}</p><div className="reader-entry-bottom"><span>{reader.paragraphs.length} 段正文 · {reader.questions.length} 道理解题</span>{progress[reader.id]?.completedAt ? <span className="reader-read-status"><CheckCircle size={16} weight="fill" />已读完</span> : <span className="reader-entry-action">开始阅读 <ArrowRight size={16} /></span>}</div></div><ArrowRight className="reader-entry-arrow" size={21} /></Link>)}</div><div className="library-more"><span>已显示 {Math.min(shownCount, visible.length)} / {visible.length} 篇</span>{visible.length > shownCount && <button type="button" className="button-outline" onClick={() => setBatch({ key: filterKey, size: shownCount + 12 })}>加载更多（{Math.min(12, visible.length - shownCount)} 篇） <ArrowRight size={16} /></button>}</div></>
            : <div className="readers-empty"><BookOpen size={36} /><h3>没有符合条件的短读</h3><button type="button" className="button-outline" onClick={clear}>重置筛选</button></div>}
        <Link className="readers-course-link" to={topic ? `/scenarios?topic=${topic.id}` : "/scenarios"}><BookOpen size={20} /><span><strong>相关课程</strong></span><ArrowRight size={20} /></Link>
      </section>
    </div>
  </div>;
}
