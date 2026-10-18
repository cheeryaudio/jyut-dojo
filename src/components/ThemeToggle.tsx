import { Moon, Sun } from "@phosphor-icons/react";
import { useState } from "react";
import { readTheme, saveTheme, type Theme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const label = theme === "light" ? "切换夜间模式" : "切换明亮模式";
  return <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={() => {
    const next = theme === "light" ? "dark" : "light";
    saveTheme(next);
    setTheme(next);
  }}>{theme === "light" ? <Moon size={18} /> : <Sun size={19} />}<span>{theme === "light" ? "夜间" : "明亮"}</span></button>;
}
