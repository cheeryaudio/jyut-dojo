import { ArrowLeft, ArrowRight, BookOpen, MagnifyingGlass, MapTrifold, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LearningLibraryNav } from "../components/LearningLibraryNav";
import { CourseCard } from "../components/CourseCard";
import { CourseCover } from "../components/CourseCover";
import { courses, courseTopics } from "../data/courses";
import { useCourseStore } from "../stores/courseStore";

const groups = courseTopics.map(topic => courses.filter(course => course.topicId === topic.id));
const browseCourses = Array.from({ length: Math.max(...groups.map(group => group.length)) }, (_, index) => groups.flatMap(group => group.slice(index, index + 1))).flat();
const pageSize = 12;

export function ScenarioCatalogPage() {
  const [params, setParams] = useSearchParams();
  const topic = courseTopics.find(item => item.id === params.get("topic"));
  const selected = topic?.id ?? "all";
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [onlyUnfinished, setOnlyUnfinished] = useState(false);
  const [pagination, setPagination] = useState({ filter: "", page: 0 });
  const { progress, hydrated, hydrate, storageError } = useCourseStore();
  useEffect(() => { void hydrate(); }, [hydrate]);
  const filtered = useMemo(() => browseCourses.filter(course =>
    (selected === "all" || course.topicId === selected)
    && (level === "all" || course.level === Number(level))
    && (!onlyUnfinished || !progress[course.id]?.completedAt)
    && `${course.title}${course.description}${course.phrases.map(phrase => `${phrase.hanzi}${phrase.mandarin}`).join("")}`.toLowerCase().includes(query.trim().toLowerCase())),
  [selected, level, onlyUnfinished, progress, query]);
  const filterKey = JSON.stringify([selected, level, onlyUnfinished, query]);
  useEffect(() => { setPagination({ filter: filterKey, page: 0 }); }, [filterKey]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = pagination.filter === filterKey ? Math.min(pagination.page, pageCount - 1) : 0;
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const changeTopic = (id: string) => { setParams(id === "all" ? {} : { topic: id }); };
  const clear = () => { changeTopic("all"); setQuery(""); setLevel("all"); setOnlyUnfinished(false); };
  const turnPage = (page: number) => {
    setPagination({ filter: filterKey, page });
    document.querySelector(".catalog-results-heading")?.scrollIntoView({ block: "start" });
  };
  return <div className="catalog-page page-enter">
    <LearningLibraryNav />
    <header className="catalog-intro"><div><h1>生活课程</h1></div><div className="catalog-numbers"><span><strong>{courseTopics.length}</strong> 个主题</span><span><strong>{courses.length}</strong> 节课</span></div></header>
    {storageError && <p className="storage-error" role="status">{storageError}</p>}
    <div className="catalog-layout">
      <aside className="catalog-sidebar"><p className="small-label">课程主题</p><nav aria-label="课程主题"><button type="button" aria-current={selected === "all" ? "page" : undefined} onClick={() => changeTopic("all")}><span>全部课程</span><small>{courses.length}</small></button>{courseTopics.map(item => <button type="button" key={item.id} aria-current={selected === item.id ? "page" : undefined} onClick={() => changeTopic(item.id)}><span>{item.name}</span><small>{courses.filter(course => course.topicId === item.id).length}</small></button>)}</nav><Link to="/path" className="catalog-path"><MapTrifold size={20} /><strong>分级课程</strong><span>查看五级能力地图</span><ArrowRight size={16} /></Link></aside>
      <section className="catalog-main" aria-label="课程列表"><div className="catalog-toolbar"><label className="search-box"><MagnifyingGlass size={19} /><input aria-label="搜索课程或表达" placeholder="搜索课名、场景或表达" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="清空搜索" onClick={() => setQuery("")}><X size={17} /></button>}</label><label className="level-select"><span className="sr-only">课程难度</span><select aria-label="课程难度" value={level} onChange={event => setLevel(event.target.value)}><option value="all">全部难度</option><option value="1">L1 入门</option><option value="2">L2 日常交流</option><option value="3">L3 连贯表达</option></select></label></div>
        {topic && <div className="topic-banner"><CourseCover scene={topic.scene} /><div><h2>{topic.name}</h2><p>{topic.description}</p></div></div>}
        <div className="catalog-results-heading"><h2>{topic ? "主题课程" : "全部课程"}<span>{filtered.length} 节</span></h2><label className="unfinished-filter"><input type="checkbox" checked={onlyUnfinished} disabled={!hydrated} onChange={event => setOnlyUnfinished(event.target.checked)} />只看未学完</label></div>
        {!hydrated ? <p className="catalog-loading" role="status">正在读取课程记录…</p> : visible.length > 0 ? <><div className="catalog-grid">{visible.map(course => <CourseCard key={course.id} course={course} />)}</div><nav className="catalog-pagination" aria-label="课程分页"><span>第 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filtered.length)} 节，共 {filtered.length} 节</span>{pageCount > 1 && <div><button type="button" aria-label="上一页课程" disabled={currentPage === 0} onClick={() => turnPage(currentPage - 1)}><ArrowLeft size={16} />上一页</button><span>{currentPage + 1} / {pageCount}</span><button type="button" aria-label="下一页课程" disabled={currentPage === pageCount - 1} onClick={() => turnPage(currentPage + 1)}>下一页<ArrowRight size={16} /></button></div>}</nav></> : <div className="empty-courses"><MagnifyingGlass size={28} /><h3>没有符合条件的课程</h3><button className="button-outline" type="button" onClick={clear}>重置筛选</button></div>}
        <Link className="readers-course-link" to={topic ? `/readers?topic=${topic.id}` : "/readers"}><BookOpen size={19} /><span><strong>{topic ? `${topic.name}：相关短读` : "生活短读"}</strong></span><ArrowRight size={16} /></Link>
      </section>
    </div>
  </div>;
}
