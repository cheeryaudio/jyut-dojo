import { ArrowLeft, ArrowRight, BookmarkSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CantoneseSpeakButton } from "../components/CantoneseSpeakButton";
import { courses } from "../data/courses";
import { useCourseStore } from "../stores/courseStore";

export function SavedExpressionsPage() {
  const { bookmarks, hydrated, hydrate, toggleBookmark, storageError } = useCourseStore();
  const [query, setQuery] = useState("");
  useEffect(() => { void hydrate(); }, [hydrate]);
  const saved = courses.flatMap(course => course.phrases.filter(phrase => bookmarks.includes(phrase.id)).map(phrase => ({ course, phrase }))).filter(({ course, phrase }) => `${course.title}${phrase.hanzi}${phrase.mandarin}`.includes(query.trim()));
  return <div className="saved-page"><Link className="back-link" to="/progress"><ArrowLeft size={16} /> 返回学习进度</Link><header className="catalog-intro"><div><h1>我的收藏</h1></div><span className="small-label">{bookmarks.length} 条收藏</span></header><div className="saved-actions"><Link className="button-outline" to="/expressions">浏览常用表达 <ArrowRight size={16} /></Link>{bookmarks.length > 0 && <Link className="text-link" to="/review">温习收藏 <ArrowRight size={16} /></Link>}</div>{storageError && <p className="storage-error" role="status">{storageError}</p>}<label className="search-box saved-search"><input aria-label="搜索收藏表达" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索粤语、释义或课程名称" /></label>{!hydrated ? <p role="status">正在读取收藏…</p> : saved.length > 0 ? <div className="saved-expressions">{saved.map(({ course, phrase }) => <article key={phrase.id}><Link className="small-label" to={`/courses/${course.id}#${phrase.id}`}>{course.title} <ArrowRight size={13} /></Link><h2>{phrase.hanzi}</h2><p className="jyutping">{phrase.jyutping}</p><p>{phrase.mandarin}</p><div><CantoneseSpeakButton text={phrase.hanzi} audio={phrase.audio} label="听示范" /><button type="button" className="bookmark-button" aria-label={`取消收藏：${phrase.hanzi}`} onClick={() => toggleBookmark(phrase.id)}><BookmarkSimple size={21} weight="fill" /></button></div></article>)}</div> : <div className="empty-courses"><BookmarkSimple size={35} /><h3>{bookmarks.length ? "没有找到这句表达" : "暂无收藏表达"}</h3><Link className="button-primary" to="/expressions">浏览常用表达 <ArrowRight size={17} /></Link></div>}</div>;
}
