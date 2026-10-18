import { ArrowRight, BookmarkSimple, BookOpen, CheckCircle } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { courses, courseById } from "../data/courses";
import { useCourseStore } from "../stores/courseStore";

export function CourseProgressSummary() {
  const { progress, bookmarks, lastCourseId, hydrate } = useCourseStore();
  useEffect(() => { void hydrate(); }, [hydrate]);
  const complete = courses.filter(course => progress[course.id]?.completedAt);
  const recent = lastCourseId ? courseById.get(lastCourseId) : undefined;
  return <section className="new-course-progress" aria-label="生活课程进度"><div className="section-heading"><div><p className="small-label">一点一点，都是积累</p><h2>生活课学习记录</h2></div><Link className="text-link" to="/scenarios">去找一节课 <ArrowRight size={17} /></Link></div><div className="course-progress-grid"><div><BookOpen size={23} /><strong>{complete.length}<small> / {courses.length}</small></strong><span>节生活课已学完</span></div><Link to="/saved"><BookmarkSimple size={23} /><strong>{bookmarks.length}</strong><span>条收藏表达 <ArrowRight size={14} /></span></Link><div><CheckCircle size={23} /><p>{recent ? "最近学到" : "还没有开始？"}</p><Link className="text-link" to={recent ? `/courses/${recent.id}` : "/courses/cafe-order"}>{recent?.title ?? "从茶餐厅的一次落单开始"}<ArrowRight size={17} /></Link></div></div>{complete.length > 0 && <div className="completed-course-list">{complete.map(course => <Link key={course.id} to={`/courses/${course.id}`}><CheckCircle size={16} weight="fill" />{course.title}<ArrowRight size={15} /></Link>)}</div>}</section>;
}
