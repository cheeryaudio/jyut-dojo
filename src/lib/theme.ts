export type Theme = "light" | "dark";
const themeKey = "jyut-dojo:appearance:v1";

export function readTheme(): Theme {
  try { return localStorage.getItem(themeKey) === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#142034" : "#f7fbff");
}

export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try { localStorage.setItem(themeKey, theme); } catch { /* The current page can still switch appearance. */ }
}
