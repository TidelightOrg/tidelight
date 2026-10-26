"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { automaticTheme } from "@/lib/automatic-theme.mjs";

export type Theme = "daylight" | "night" | "blue" | "white" | "dark";
export type ThemePreference = Theme | "auto";
export type ExperienceMode = "mini" | "pro";
export const themes: { id: Theme; name: string; detail: string; swatches: string[] }[] = [
  { id: "daylight", name: "Daylight", detail: "Warm paper, clear ink", swatches: ["#f5f3eb", "#18382f", "#76ae88"] },
  { id: "night", name: "Night Tide", detail: "The original deep sea", swatches: ["#080f11", "#a8ebc8", "#142522"] },
  { id: "blue", name: "Blue Hour", detail: "A cooler evening desk", swatches: ["#0b1020", "#b6c5ff", "#222b4c"] },
  { id: "white", name: "White", detail: "Bright white, crisp contrast", swatches: ["#ffffff", "#153b31", "#e8f0eb"] },
  { id: "dark", name: "Dark", detail: "Graphite, low-glare surfaces", swatches: ["#090a0c", "#d8e1dc", "#202328"] },
];
const DEFAULT_THEME: Theme = "blue";
const ThemeContext = createContext<{ theme: Theme; preference: ThemePreference; setTheme: (theme: ThemePreference) => void }>({ theme: DEFAULT_THEME, preference: "auto", setTheme: () => {} });
const ExperienceContext = createContext<{ mode: ExperienceMode; setMode: (mode: ExperienceMode) => void }>({ mode: "pro", setMode: () => {} });
const validTheme = (value: string | null): value is Theme => value === "night" || value === "daylight" || value === "blue" || value === "white" || value === "dark";
const getPreference = (): ThemePreference => {
  const shared = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme="))?.slice("tidelight-theme=".length);
  const mode = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("tidelight-theme-mode="))?.slice("tidelight-theme-mode=".length);
  if (mode === "manual" && validTheme(shared ?? null)) return shared as Theme;
  if (mode === "auto") return "auto";
  return "auto";
};
const saveTheme = (preference: ThemePreference) => {
  try { window.localStorage.removeItem("tidelight-theme"); } catch { /* Theme selection still works when storage is blocked. */ }
  const sharedDomain = location.hostname === "tidelight.app" || location.hostname.endsWith(".tidelight.app") ? `; Domain=.tidelight.app${location.protocol === "https:" ? "; Secure" : ""}` : "";
  // Keep a manual choice only while this page is active. Leaving the site clears it,
  // so a new visit starts with the dynamic local-clock theme.
  document.cookie = `tidelight-theme=${preference}; Path=/; SameSite=Lax${sharedDomain}`;
  document.cookie = `tidelight-theme-mode=${preference === "auto" ? "auto" : "manual"}; Path=/; SameSite=Lax${sharedDomain}`;
};
const clearThemePreference = () => {
  const sharedDomain = location.hostname === "tidelight.app" || location.hostname.endsWith(".tidelight.app") ? `; Domain=.tidelight.app${location.protocol === "https:" ? "; Secure" : ""}` : "";
  document.cookie = `tidelight-theme=; Path=/; Max-Age=0; SameSite=Lax${sharedDomain}`;
  document.cookie = `tidelight-theme-mode=; Path=/; Max-Age=0; SameSite=Lax${sharedDomain}`;
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
    const restoreDynamicTheme = () => {
      clearThemePreference();
      window.dispatchEvent(new Event("tidelight-theme-change"));
    };
    window.addEventListener("pagehide", clearThemePreference);
    window.addEventListener("pageshow", restoreDynamicTheme);
    return () => {
      window.removeEventListener("pagehide", clearThemePreference);
      window.removeEventListener("pageshow", restoreDynamicTheme);
    };
  }, []);
  useEffect(() => {
    // Explicit choices follow the current browser session across Tidelight products; automatic mode resolves locally.
    saveTheme(preference);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = preference;
    document.documentElement.dataset.experience = mode;
    document.documentElement.style.colorScheme = theme === "daylight" || theme === "white" ? "light" : "dark";
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

