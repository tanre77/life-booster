export type ThemeChoice = "light" | "dark" | "system";

const KEY = "lb-theme";

export function readThemeChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function themeIsDark(choice: ThemeChoice): boolean {
  if (choice === "dark") return true;
  if (choice === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(choice: ThemeChoice) {
  document.documentElement.classList.toggle("dark", themeIsDark(choice));
  window.localStorage.setItem(KEY, choice);
}
