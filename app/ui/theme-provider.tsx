"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "daylight" | "night" | "blue";
export type ThemePreference = Theme | "auto";
export type ExperienceMode = "mini" | "pro";
export const themes: { id: Theme; name: string; detail: string; swatches: string[] }[] = [
  { id: "daylight", name: "Daylight", detail: "Warm paper, clear ink", swatches: ["#f5f3eb", "#18382f", "#76ae88"] },
  { id: "night", name: "Night Tide", detail: "The original deep sea", swatches: ["#080f11", "#a8ebc8", "#142522"] },
  { id: "blue", name: "Blue Hour", detail: "A cooler evening desk", swatches: ["#0b1020", "#b6c5ff", "#222b4c"] },
];
const DEFAULT_THEME: Theme = "blue";
const ThemeContext = createContext<{ theme: Theme; preference: ThemePreference; setTheme: (theme: ThemePreference) => void }>({ theme: DEFAULT_THEME, preference: "auto", setTheme: () => {} });
const ExperienceContext = createContext<{ mode: ExperienceMode; setMode: (mode: ExperienceMode) => void }>({ mode: "pro", setMode: () => {} });
const validTheme = (value: string | null): value is Theme => value === "night" || value === "daylight" || value === "blue";
function automaticTheme(at = new Date()): Theme {
  const hour = at.getHours();
  return hour >= 7 && hour < 17 ? "daylight" : hour >= 17 && hour < 21 ? "blue" : "night";
}
const getPreference = (): ThemePreference => {
  const shared = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme="))?.slice("tidelight-theme=".length);
  const mode = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme-mode="))?.slice("tidelight-theme-mode=".length);
  if (mode === "manual" && validTheme(shared ?? null)) return shared as Theme;
  if (mode === "auto") return "auto";
  if (validTheme(shared ?? null) && shared !== DEFAULT_THEME) return shared as Theme;
  // Older builds persisted Blue Hour on first load even when the visitor had never chosen a palette.
  // Treat that legacy default as automatic; a deliberate choice is marked by theme-mode on this build.
  const saved = window.localStorage.getItem("tidelight-theme");
  if (saved === "night" || saved === "daylight") return saved;
  return "auto";
};
const saveTheme = (preference: ThemePreference) => {
  window.localStorage.setItem("tidelight-theme", preference);
  const sharedDomain = location.hostname === "tidelight.app" || location.hostname.endsWith(".tidelight.app") ? "; Domain=.tidelight.app; Secure" : "";
  document.cookie = `tidelight-theme=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}`;
  document.cookie = `tidelight-theme-mode=${preference === "auto" ? "auto" : "manual"}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}`;
};
const getTheme = (): Theme => { const preference = getPreference(); return preference === "auto" ? automaticTheme() : preference; };
const getExperienceMode = (): ExperienceMode => window.localStorage.getItem("tidelight-experience") === "mini" ? "mini" : "pro";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("tidelight-theme-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("tidelight-theme-change", callback); };
};

export function ThemeProvider({ children, initialTheme = DEFAULT_THEME }: { children: ReactNode; initialTheme?: Theme }) {
  const [clock, setClock] = useState(0);
  const preference = useSyncExternalStore(subscribe, getPreference, (): ThemePreference => "auto");
  const theme = useSyncExternalStore(subscribe, getTheme, (): Theme => initialTheme);
  const mode = useSyncExternalStore(subscribe, getExperienceMode, (): ExperienceMode => "pro");
  const setMode = (next: ExperienceMode) => {
    window.localStorage.setItem("tidelight-experience", next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  useEffect(() => {
    const timer = window.setInterval(() => setClock(value => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    // Explicit choices persist across Tidelight products; automatic mode resolves on the visitor's local clock.
    saveTheme(preference);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = preference;
    document.documentElement.dataset.experience = mode;
    document.documentElement.style.colorScheme = theme === "daylight" ? "light" : "dark";
    void clock;
  }, [clock, mode, preference, theme]);
  const setTheme = (next: ThemePreference) => {
    saveTheme(next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
    setClock(value => value + 1);
  };
  return <ThemeContext.Provider value={{ theme, preference, setTheme }}><ExperienceContext.Provider value={{ mode, setMode }}>{children}</ExperienceContext.Provider></ThemeContext.Provider>;
}

export function ThemePicker() {
  const { theme, preference, setTheme } = useContext(ThemeContext);
  return <fieldset className="theme-picker">
    <legend className="sr-only">Choose a color theme</legend>
    <button type="button" className={`theme-option${preference === "auto" ? " selected" : ""}`} aria-pressed={preference === "auto"} onClick={() => setTheme("auto")}><span className="theme-swatches" aria-hidden="true"><i style={{ background: "linear-gradient(135deg,#f5f3eb 0 33%,#222b4c 33% 66%,#080f11 66%)" }}/></span><span className="theme-option-copy"><b>Automatic</b><small>Changes with your local time</small></span><span className="theme-check" aria-hidden="true">{preference === "auto" ? "✓" : ""}</span></button>
    {themes.map((option) => <button type="button" key={option.id} className={`theme-option${preference === option.id ? " selected" : ""}`} aria-pressed={preference === option.id} onClick={() => setTheme(option.id)}>
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
  const { theme, preference, setTheme } = useContext(ThemeContext);
  return <div className="theme-quick-switch" role="group" aria-label="Quick theme switcher">
    <button type="button" className={`theme-quick-option theme-quick-auto${preference === "auto" ? " selected" : ""}`} aria-label="Use automatic theme" aria-pressed={preference === "auto"} onClick={() => setTheme("auto")}><span className="theme-quick-swatch" aria-hidden="true">A</span></button>
    {themes.map((option) => <button type="button" key={option.id} className={`theme-quick-option${preference === option.id ? " selected" : ""}`} aria-label={`Use ${option.name} theme`} aria-pressed={preference === option.id} onClick={() => setTheme(option.id)}>
      <span className="theme-quick-swatch" style={{ backgroundColor: option.swatches[0], borderColor: option.swatches[1] }} aria-hidden="true" />
    </button>)}
    <span className="theme-quick-label" aria-hidden="true">{preference === "auto" ? `Auto · ${themes.find((option) => option.id === theme)?.name}` : themes.find((option) => option.id === theme)?.name}</span>
  </div>;
}

export function ExperienceSwitch() {
  const { mode, setMode } = useContext(ExperienceContext);
  return <div className="experience-switch" role="group" aria-label="Choose workspace experience">
    <button type="button" className={mode === "mini" ? "selected" : ""} aria-pressed={mode === "mini"} onClick={() => setMode("mini")}>MINI</button>
    <button type="button" className={mode === "pro" ? "selected" : ""} aria-pressed={mode === "pro"} onClick={() => setMode("pro")}>PRO</button>
  </div>;
}

