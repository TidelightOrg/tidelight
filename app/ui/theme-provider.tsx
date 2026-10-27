"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "dark" | "white";
export type ExperienceMode = "mini" | "pro";
export const themes: { id: Theme; name: string; detail: string; swatches: string[] }[] = [
  { id: "dark", name: "Dark", detail: "Graphite, low-glare surfaces", swatches: ["#090a0c", "#d8e1dc", "#202328"] },
  { id: "white", name: "White", detail: "Bright white, crisp contrast", swatches: ["#ffffff", "#153b31", "#e8f0eb"] },
];
const DEFAULT_THEME: Theme = "dark";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: DEFAULT_THEME, setTheme: () => {} });
const ExperienceContext = createContext<{ mode: ExperienceMode; setMode: (mode: ExperienceMode) => void }>({ mode: "pro", setMode: () => {} });
const validTheme = (value: string | null): value is Theme => value === "white" || value === "dark";
const getTheme = (): Theme => {
  const shared = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme="))?.slice("tidelight-theme=".length) ?? null;
  const mode = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme-mode="))?.slice("tidelight-theme-mode=".length);
  return mode === "manual" && validTheme(shared) ? shared : DEFAULT_THEME;
};
const saveTheme = (theme: Theme) => {
  try { window.localStorage.removeItem("tidelight-theme"); } catch { /* Theme selection still works when storage is blocked. */ }
  const sharedDomain = location.hostname === "tidelight.app" || location.hostname.endsWith(".tidelight.app") ? `; Domain=.tidelight.app${location.protocol === "https:" ? "; Secure" : ""}` : "";
  // Keep an explicit choice available across Tidelight pages and subdomains in this browser session.
  document.cookie = `tidelight-theme=${theme}; Path=/; SameSite=Lax${sharedDomain}`;
  document.cookie = `tidelight-theme-mode=manual; Path=/; SameSite=Lax${sharedDomain}`;
};
const getExperienceMode = (): ExperienceMode => window.localStorage.getItem("tidelight-experience") === "mini" ? "mini" : "pro";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("tidelight-theme-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("tidelight-theme-change", callback); };
};

export function ThemeProvider({ children, initialTheme = DEFAULT_THEME }: { children: ReactNode; initialTheme?: Theme }) {
  const theme = useSyncExternalStore(subscribe, getTheme, (): Theme => initialTheme);
  const mode = useSyncExternalStore(subscribe, getExperienceMode, (): ExperienceMode => "pro");
  const setMode = (next: ExperienceMode) => {
    window.localStorage.setItem("tidelight-experience", next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  useEffect(() => {
    saveTheme(theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = "manual";
    document.documentElement.dataset.experience = mode;
    document.documentElement.style.colorScheme = theme === "white" ? "light" : "dark";
  }, [mode, theme]);
  const setTheme = (next: Theme) => {
    saveTheme(next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  return <ThemeContext.Provider value={{ theme, setTheme }}><ExperienceContext.Provider value={{ mode, setMode }}>{children}</ExperienceContext.Provider></ThemeContext.Provider>;
}

export function ThemePicker() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <fieldset className="theme-picker">
    <legend className="sr-only">Choose a color theme</legend>
    {themes.map((option) => <button type="button" key={option.id} className={`theme-option${theme === option.id ? " selected" : ""}`} aria-pressed={theme === option.id} onClick={() => setTheme(option.id)}>
      <span className="theme-swatches" aria-hidden="true">{option.swatches.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span>
      <span className="theme-option-copy"><b>{option.name}</b><small>{option.detail}</small></span>
      <span className="theme-check" aria-hidden="true">{theme === option.id ? "✓" : ""}</span>
    </button>)}
  </fieldset>;
}

export function useExperience() {
  return useContext(ExperienceContext);
}

export function ThemeQuickSwitch() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <div className="theme-quick-switch" role="group" aria-label="Quick theme switcher">
    {themes.map((option) => <button type="button" key={option.id} className={`theme-quick-option${theme === option.id ? " selected" : ""}`} aria-label={`Use ${option.name} theme`} aria-pressed={theme === option.id} onClick={() => setTheme(option.id)}>
      <span className="theme-quick-swatch" style={{ backgroundColor: option.swatches[0], borderColor: option.swatches[1] }} aria-hidden="true" />
    </button>)}
  </div>;
}

export function ExperienceSwitch() {
  const { mode, setMode } = useContext(ExperienceContext);
  return <div className="experience-switch" role="group" aria-label="Choose workspace experience">
    <button type="button" className={mode === "mini" ? "selected" : ""} aria-pressed={mode === "mini"} onClick={() => setMode("mini")}>MINI</button>
    <button type="button" className={mode === "pro" ? "selected" : ""} aria-pressed={mode === "pro"} onClick={() => setMode("pro")}>PRO</button>
  </div>;
}
