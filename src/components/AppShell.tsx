import { BookOpenText, ChartBar, House, Repeat, Waveform } from "@phosphor-icons/react";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useLearningStore } from "../stores/learningStore";
import { isNativeApp } from "../native";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  { to: "/", label: "首页", icon: House, end: true },
  { to: "/scenarios", label: "课程", icon: BookOpenText, end: false },
  { to: "/tones", label: "声调", icon: Waveform, end: false },
  { to: "/review", label: "温习", icon: Repeat, end: false },
  { to: "/progress", label: "进度", icon: ChartBar, end: false },
] as const;

export function AppShell() {
  const hydrate = useLearningStore(state => state.hydrate);
  const { pathname, hash } = useLocation();
  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname, hash]);
  useEffect(() => {
    if (!isNativeApp) return;
    let active = true;
    let removeListener: (() => Promise<void>) | undefined;
    void import("@capacitor/app").then(async ({ App }) => {
      const listener = await App.addListener("backButton", ({ canGoBack }) => { if (canGoBack) window.history.back(); else void App.exitApp(); });
      if (active) removeListener = listener.remove; else await listener.remove();
    });
    return () => { active = false; void removeListener?.(); };
  }, []);
  return <div className="dojo-app min-h-[100dvh]">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="app-header"><div className="app-top-bar"><NavLink to="/" className="brand" aria-label="粵語道場首页"><span className="brand-mark"><BookOpenText size={23} weight="bold" /></span><span><strong>粵語道場</strong></span></NavLink><nav className="primary-navigation" aria-label="主要功能">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive || (to === "/scenarios" && (pathname.startsWith("/courses/") || pathname.startsWith("/readers") || pathname === "/expressions")) || (to === "/progress" && pathname === "/saved") ? "active" : ""}><Icon size={19} weight="regular" aria-hidden="true" /><span>{label}</span></NavLink>)}</nav><div className="header-controls"><ThemeToggle /></div></div></header>
    <main id="main-content" className="app-main"><Outlet /></main>
    <footer className="app-footer"><div><strong>粵語道場</strong></div><div><span>学习记录保存在当前设备</span><NavLink to="/privacy">私隐政策</NavLink></div></footer>
  </div>;
}
