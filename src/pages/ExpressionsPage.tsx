import { ArrowRight, BookmarkSimple, Books, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { LearningLibraryNav } from "../components/LearningLibraryNav";
import { sentences } from "../data";
import { courses, courseTopics, topicById } from "../data/courses";
import { useCourseStore } from "../stores/courseStore";
import type { Course, CoursePhrase } from "../types/course";

type ExpressionSource = { course: Course; phrase: CoursePhrase };
type Expression = { key: string; sources: ExpressionSource[]; searchFields: string[] };

// Keep the handbook count consistent with uniqueCoursePhrases in the course catalogue.
const phraseKey = (text: string) => text.replace(/[\s，。！？、；：…]/g, "");
const searchKey = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[\s，。！？、；：…,.!?;:]/g, "");
const staticAudio = new Map(sentences.map(sentence => [phraseKey(sentence.hanzi), sentence.audio]));
const expressionMap = new Map<string, Expression>();

for (const course of courses) {
  for (const phrase of course.phrases) {
    const key = phraseKey(phrase.hanzi);
    const entry = expressionMap.get(key) ?? { key, sources: [], searchFields: [] };
    entry.sources.push({ course, phrase });
    entry.searchFields.push(...[phrase.hanzi, phrase.mandarin, phrase.jyutping, phrase.jyutping.replace(/[1-6]/g, ""), phrase.note ?? "", course.title, topicById.get(course.topicId)?.name ?? ""].map(searchKey));
    expressionMap.set(key, entry);
  }
}

const expressions = [...expressionMap.values()];
const topicCounts = new Map(courseTopics.map(topic => [topic.id, expressions.filter(entry => entry.sources.some(source => source.course.topicId === topic.id)).length]));
const BATCH_SIZE = 30;

export function ExpressionsPage() {
  const [params, setParams] = useSearchParams();
  const topic = courseTopics.find(item => item.id === params.get("topic"));
  const selected = topic?.id ?? "all";
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [showJyutping, setShowJyutping] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [pagination, setPagination] = useState({ filter: "", limit: BATCH_SIZE });
  const [pendingBookmarks, setPendingBookmarks] = useState<string[]>([]);
  const { bookmarks, hydrate, hydrated, storageError, toggleBookmark } = useCourseStore();
  useEffect(() => { void hydrate(); }, [hydrate]);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const isSaved = (entry: Expression) => entry.sources.some(source => bookmarkSet.has(source.phrase.id));
  const savedCount = expressions.filter(isSaved).length;
  const normalizedQuery = searchKey(query.trim());
  const filterKey = `${selected}:${savedOnly}:${normalizedQuery}`;
  const limit = pagination.filter === filterKey ? pagination.limit : BATCH_SIZE;
  useEffect(() => { setPagination({ filter: filterKey, limit: BATCH_SIZE }); }, [filterKey]);
  const filtered = useMemo(() => expressions.filter(entry =>
    (selected === "all" || entry.sources.some(source => source.course.topicId === selected))
    && (!savedOnly || entry.sources.some(source => bookmarkSet.has(source.phrase.id)))
    && (!normalizedQuery || entry.searchFields.some(field => field.includes(normalizedQuery)))),
  [selected, savedOnly, bookmarkSet, normalizedQuery]);
  const visible = filtered.slice(0, limit);
  const resetFilters = () => { setQuery(""); setSavedOnly(false); setParams({}); };

  const changeBookmark = async (entry: Expression) => {
    if (pendingBookmarks.includes(entry.key)) return;
    setPendingBookmarks(previous => [...previous, entry.key]);
    try {
      // A shared sentence may have been saved from either lesson. Remove every
      // saved source so that the handbook and the original lesson stay in sync.
      const current = new Set(useCourseStore.getState().bookmarks);
      const savedSources = entry.sources.filter(source => current.has(source.phrase.id));
      if (savedSources.length > 0) {
        for (const source of savedSources) await toggleBookmark(source.phrase.id);
      } else {
        const first = entry.sources.find(source => source.course.topicId === selected) ?? entry.sources[0];
        if (first) await toggleBookmark(first.phrase.id);
      }
    } finally {
      setPendingBookmarks(previous => previous.filter(key => key !== entry.key));
    }
  };

  return <div className="expressions-page page-enter">
    <LearningLibraryNav />
    <header className="expressions-intro">
      <h1>常用表达</h1>

      <div className="expressions-intro-meta"><span><Books size={18} />{expressions.length} 条表达</span><span>来自 {courses.length} 节课程</span><span>{hydrated ? `已收藏 ${savedCount} 句` : "正在读取本机收藏"}</span></div>
    </header>
    {storageError && <p className="storage-error" role="status">{storageError}</p>}
    <div className="expressions-browse">
      <aside className="expressions-topics">
        <p className="small-label">主题</p>
        <nav aria-label="表达主题">
          <button type="button" aria-current={selected === "all" ? "page" : undefined} onClick={() => setParams({})}>全部表达<span>{expressions.length}</span></button>
          {courseTopics.map(item => <button type="button" key={item.id} aria-current={selected === item.id ? "page" : undefined} onClick={() => setParams({ topic: item.id })}>{item.name}<span>{topicCounts.get(item.id)}</span></button>)}
        </nav>

        <Link className="expressions-review-link" to="/review">温习收藏<ArrowRight size={16} /></Link>
      </aside>
      <section className="expressions-main" aria-label="常用表达">
        <div className="expressions-tools">
          <label className="search-box"><MagnifyingGlass size={20} /><input type="search" aria-label="搜索粤语、普通话或粤拼表达" placeholder="搜索中文、粤语或粤拼" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="清空表达搜索" onClick={() => setQuery("")}><X size={18} /></button>}</label>
          <label className="expressions-saved-only"><input type="checkbox" checked={savedOnly} disabled={!hydrated} onChange={event => setSavedOnly(event.target.checked)} />只看收藏</label>
        </div>
        <div className="expressions-list-heading">
          <div><h2>{topic?.name ?? "全部表达"}</h2><p aria-live="polite">找到 {filtered.length} 句{query.trim() ? `，关键词「${query.trim()}」` : ""}</p></div>
          <div className="reading-toggles expressions-reading-toggles"><button type="button" aria-pressed={showJyutping} onClick={() => setShowJyutping(!showJyutping)}>粤拼 {showJyutping ? "开" : "关"}</button><button type="button" aria-pressed={showTranslation} onClick={() => setShowTranslation(!showTranslation)}>释义 {showTranslation ? "开" : "关"}</button></div>
        </div>
        {!hydrated ? <div className="expressions-loading" role="status"><p>正在载入表达和本机收藏…</p>{[1, 2, 3, 4].map(item => <div key={item} aria-hidden="true"><span /><span /><span /></div>)}</div>
          : filtered.length === 0 ? <div className="expressions-empty"><MagnifyingGlass size={35} /><h3>{savedOnly ? "没有符合条件的收藏" : "没有找到相关表达"}</h3><button type="button" className="button-outline" onClick={resetFilters}>重置筛选</button></div>
            : <>
              <div className="expressions-list">{visible.map(entry => {
                const first = entry.sources.find(source => source.course.topicId === selected) ?? entry.sources[0];
                if (!first) return null;
                const { course, phrase } = first;
                const saved = isSaved(entry);
                const courseCount = new Set(entry.sources.map(source => source.course.id)).size;
                const audio = entry.sources.find(source => source.phrase.audio)?.phrase.audio ?? staticAudio.get(entry.key);
                return <article className="expression-entry" key={entry.key}>
                  <div className="expression-entry-meta"><span>{topicById.get(course.topicId)?.name}</span>{courseCount > 1 && <span>来自 {courseCount} 节课</span>}</div>
                  <h3 lang="zh-HK">{phrase.hanzi}</h3>
                  {showJyutping && <p className="expression-entry-jyutping">{phrase.jyutping}</p>}
                  {showTranslation && <p className="expression-entry-translation">{phrase.mandarin}</p>}
                  {phrase.note && <p className="expression-entry-note">{phrase.note}</p>}
                  <div className="expression-entry-actions"><CantoneseSpeakButton text={phrase.hanzi} audio={audio} label="听示范" /><button type="button" className="expression-bookmark" disabled={pendingBookmarks.includes(entry.key)} aria-label={`${saved ? "取消收藏" : "收藏"}：${phrase.hanzi}`} aria-pressed={saved} onClick={() => { void changeBookmark(entry); }}><BookmarkSimple size={20} weight={saved ? "fill" : "regular"} /><span>{saved ? "已收藏" : "收藏"}</span></button></div>
                  <Link className="expression-course-link" to={`/courses/${course.id}#${phrase.id}`}><span>所属课程<strong>{course.title}</strong></span><ArrowRight size={16} /></Link>
                </article>;
              })}</div>
              <div className="expressions-more"><p>已显示 {visible.length} / {filtered.length} 句</p>{visible.length < filtered.length ? <button type="button" className="button-outline" onClick={() => setPagination({ filter: filterKey, limit: limit + BATCH_SIZE })}>加载更多（{Math.min(BATCH_SIZE, filtered.length - visible.length)} 句）<ArrowRight size={17} /></button> : <span>已显示全部结果</span>}</div>
            </>}
      </section>
    </div>
  </div>;
}
