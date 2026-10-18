import { ArrowUpRight, CheckCircle, Clock } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { Course } from "../types/course";
import { topicById } from "../data/courses";
import { useCourseStore } from "../stores/courseStore";
import { CourseCover } from "./CourseCover";

export function CourseCard({ course, compact = false }: { course: Course; compact?: boolean }) {
  const progress = useCourseStore(state => state.progress[course.id]);
  const hydrated = useCourseStore(state => state.hydrated);
  const completed = Boolean(progress?.completedAt);
  const answered = course.exercises.filter(exercise => progress?.answers[exercise.id]).length;
  const topic = topicById.get(course.topicId);
  return <Link to={`/courses/${course.id}`} className={`course-card ${compact ? "course-card-compact" : ""}`}>
    <CourseCover scene={topic?.scene ?? 0} />
    <div className="course-card-copy">
      <div className="course-card-meta"><span>{topic?.name}</span><span className="course-level">L{course.level}</span></div>
      <h3>{course.title}<ArrowUpRight aria-hidden="true" /></h3>
      <p>{course.description}</p>
      <div className="course-card-bottom"><span><Clock size={14} />{course.minutes} 分钟 · {course.phrases.length} 句</span><span className={completed ? "course-status is-complete" : "course-status"}>{!hydrated ? "" : completed ? <><CheckCircle size={15} weight="fill" />已学完</> : answered > 0 ? `已答 ${answered}/${course.exercises.length}` : progress?.openedAt ? "学习中" : "未开始"}</span></div>
    </div>
  </Link>;
}
