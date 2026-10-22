"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "daylight" | "night" | "blue";
export type ExperienceMode = "mini" | "pro";
export const themes: { id: Theme; name: string; detail: string; swatches: string[] }[] = [
  { id: "daylight", name: "Daylight", detail: "Warm paper, clear ink", swatches: ["#f5f3eb", "#18382f", "#76ae88"] },
  { id: "night", name: "Night Tide", detail: "The original deep sea", swatches: ["#080f11", "#a8ebc8", "#142522"] },
  { id: "blue", name: "Blue Hour", detail: "A cooler evening desk", swatches: ["#0b1020", "#b6c5ff", "#222b4c"] },
];
const DEFAULT_THEME: Theme = "blue";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: DEFAULT_THEME, setTheme: () => {} });
const ExperienceContext = createContext<{ mode: ExperienceMode; setMode: (mode: ExperienceMode) => void }>({ mode: "pro", setMode: () => {} });
const validTheme = (value: string | null): value is Theme => value === "night" || value === "daylight" || value === "blue";
const getSharedTheme = (): Theme | null => {
  const shared = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme="))?.slice("tidelight-theme=".length);
  return validTheme(shared ?? null) ? shared as Theme : null;
};
const saveTheme = (theme: Theme) => {
  window.localStorage.setItem("tidelight-theme", theme);
  const sharedDomain = location.hostname === "tidelight.app" || location.hostname.endsWith(".tidelight.app") ? "; Domain=.tidelight.app; Secure" : "";
  document.cookie = `tidelight-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}`;
};
const getTheme = (): Theme => {
  const shared = getSharedTheme();
  if (shared) return shared;
  const saved = window.localStorage.getItem("tidelight-theme");
  return validTheme(saved) ? saved : DEFAULT_THEME;
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
  const setTheme = (next: Theme) => {
    saveTheme(next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  const setMode = (next: ExperienceMode) => {
    window.localStorage.setItem("tidelight-experience", next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  useEffect(() => {
    // Migrate the existing per-host preference into a cookie shared by Tidelight subdomains.
    saveTheme(theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.experience = mode;
    document.documentElement.style.colorScheme = theme === "daylight" ? "light" : "dark";
  }, [mode, theme]);
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
    <span className="theme-quick-label" aria-hidden="true">{themes.find((option) => option.id === theme)?.name}</span>
  </div>;
}

export function ExperienceSwitch() {
  const { mode, setMode } = useContext(ExperienceContext);
  return <div className="experience-switch" role="group" aria-label="Choose workspace experience">
    <button type="button" className={mode === "mini" ? "selected" : ""} aria-pressed={mode === "mini"} onClick={() => setMode("mini")}>MINI</button>
    <button type="button" className={mode === "pro" ? "selected" : ""} aria-pressed={mode === "pro"} onClick={() => setMode("pro")}>PRO</button>
  </div>;
}

