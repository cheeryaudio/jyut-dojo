import { BookOpen, ChatCircleText, Rows } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";

const sections = [
  { to: "/scenarios", label: "生活课程", icon: Rows },
  { to: "/readers", label: "生活短读", icon: BookOpen },
  { to: "/expressions", label: "常用表达", icon: ChatCircleText },
];

export function LearningLibraryNav() {
  const { pathname } = useLocation();
  return <nav className="library-navigation" aria-label="学习内容类型">{sections.map(({ to, label, icon: Icon }) => <Link key={to} to={to} aria-current={pathname.startsWith(to) ? "page" : undefined}><Icon size={17} aria-hidden="true" />{label}</Link>)}</nav>;
}
