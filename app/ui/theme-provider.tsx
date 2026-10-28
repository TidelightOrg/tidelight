"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "dark" | "white";
export type ThemeMode = "auto" | "device" | "manual";
export type ExperienceMode = "mini" | "pro";

export const themes: { id: Theme; name: string; detail: string; swatches: string[] }[] = [
  { id: "dark", name: "Dark", detail: "Graphite, low-glare surfaces", swatches: ["#090a0c", "#d8e1dc", "#202328"] },
  { id: "white", name: "White", detail: "Bright white, crisp contrast", swatches: ["#ffffff", "#153b31", "#e8f0eb"] },
];

const DEFAULT_THEME: Theme = "dark";
const ThemeContext = createContext<{ theme: Theme; mode: ThemeMode; setTheme: (theme: Theme) => void; setMode: (mode: ThemeMode) => void }>({
  theme: DEFAULT_THEME, mode: "auto", setTheme: () => {}, setMode: () => {},
});
const ExperienceContext = createContext<{ mode: ExperienceMode; setMode: (mode: ExperienceMode) => void }>({ mode: "pro", setMode: () => {} });

const validTheme = (value: string | null): value is Theme => value === "white" || value === "dark";
const cookieValue = (name: string) => document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
const sharedDomain = () => location.hostname === "tidelight.app" || location.hostname.endsWith(".tidelight.app")
  ? `; Domain=.tidelight.app${location.protocol === "https:" ? "; Secure" : ""}`
  : "";
const writeCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=31536000${sharedDomain()}`;
};
const getTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
};
const automaticTheme = (timeZone: string): Theme => {
  try {
    const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date()));
    return hour >= 7 && hour < 19 ? "white" : "dark";
  } catch {
    return automaticTheme("UTC");
  }
};
const systemTheme = (): Theme => window.matchMedia?.("(prefers-color-scheme: light)").matches ? "white" : "dark";
const getThemeMode = (): ThemeMode => {
  const value = cookieValue("tidelight-theme-mode");
  return value === "manual" || value === "device" ? value : "auto";
};
const getTheme = (): Theme => {
  const mode = getThemeMode();
  if (mode === "device") return systemTheme();
  if (mode === "manual") {
    const selected = cookieValue("tidelight-theme");
    if (validTheme(selected)) return selected;
  }
  return automaticTheme(cookieValue("tidelight-timezone") || getTimeZone());
};
const syncTheme = (theme: Theme) => {
  writeCookie("tidelight-timezone", getTimeZone());
  writeCookie("tidelight-theme", theme);
};
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("tidelight-theme-change", callback);
  const media = window.matchMedia?.("(prefers-color-scheme: light)");
  media?.addEventListener?.("change", callback);
  const interval = window.setInterval(callback, 60_000);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("tidelight-theme-change", callback);
    media?.removeEventListener?.("change", callback);
    window.clearInterval(interval);
  };
};

export function ThemeProvider({ children, initialTheme = DEFAULT_THEME }: { children: ReactNode; initialTheme?: Theme }) {
  const theme = useSyncExternalStore(subscribe, getTheme, (): Theme => initialTheme);
  const mode = useSyncExternalStore(subscribe, getThemeMode, (): ThemeMode => "auto");
  const experienceMode = useSyncExternalStore(
    callback => {
      window.addEventListener("storage", callback);
      window.addEventListener("tidelight-theme-change", callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("tidelight-theme-change", callback);
      };
    },
    (): ExperienceMode => window.localStorage.getItem("tidelight-experience") === "mini" ? "mini" : "pro",
    (): ExperienceMode => "pro",
  );

  useEffect(() => {
    syncTheme(theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.experience = experienceMode;
    document.documentElement.style.colorScheme = theme === "white" ? "light" : "dark";
  }, [experienceMode, mode, theme]);

  const setTheme = (next: Theme) => {
    writeCookie("tidelight-theme-mode", "manual");
    writeCookie("tidelight-theme", next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  const setMode = (next: ThemeMode) => {
    writeCookie("tidelight-theme-mode", next);
    if (next === "auto") writeCookie("tidelight-timezone", getTimeZone());
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };
  const setExperienceMode = (next: ExperienceMode) => {
    window.localStorage.setItem("tidelight-experience", next);
    window.dispatchEvent(new Event("tidelight-theme-change"));
  };

  return <ThemeContext.Provider value={{ theme, mode, setTheme, setMode }}>
    <ExperienceContext.Provider value={{ mode: experienceMode, setMode: setExperienceMode }}>{children}</ExperienceContext.Provider>
  </ThemeContext.Provider>;
}

function ThemeIcon({ name, className }: { name: "sun" | "device" | "moon" | "auto"; className?: string }) {
  const shared = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "sun") return <svg {...shared}><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
  if (name === "device") return <svg {...shared}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>;
  if (name === "moon") return <svg {...shared}><path d="M20.2 15.2A8.6 8.6 0 0 1 8.8 3.8 8.7 8.7 0 1 0 20.2 15.2Z" /></svg>;
  return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M4.9 4.9l1.4 1.4" /></svg>;
}

export function ThemePicker() {
  const { theme, mode, setTheme, setMode } = useContext(ThemeContext);
  const options = [
    { id: "auto", label: "Automatic", detail: "Follows local time", icon: "auto" as const, selected: mode === "auto", choose: () => setMode("auto") },
    { id: "device", label: "Device", detail: "Follows device setting", icon: "device" as const, selected: mode === "device", choose: () => setMode("device") },
    { id: "white", label: "Light", detail: "Bright, crisp contrast", icon: "sun" as const, selected: mode === "manual" && theme === "white", choose: () => setTheme("white") },
    { id: "dark", label: "Dark", detail: "Low-glare surfaces", icon: "moon" as const, selected: mode === "manual" && theme === "dark", choose: () => setTheme("dark") },
  ];
  return <fieldset className="theme-picker">
    <legend className="sr-only">Choose a color theme</legend>
    {options.map(option => <button type="button" key={option.id} className={`theme-option${option.selected ? " selected" : ""}`} aria-pressed={option.selected} onClick={option.choose}>
      <span className="theme-option-icon"><ThemeIcon name={option.icon} /></span>
      <span className="theme-option-copy"><b>{option.label}</b><small>{option.detail}</small></span>
      <span className="theme-check" aria-hidden="true">{option.selected ? "✓" : ""}</span>
    </button>)}
  </fieldset>;
}

export function useExperience() {
  return useContext(ExperienceContext);
}

export function ThemeQuickSwitch() {
  const { theme, mode, setTheme, setMode } = useContext(ThemeContext);
  const options = [
    { id: "white", label: "Light theme", icon: "sun" as const, selected: mode === "manual" && theme === "white", choose: () => setTheme("white") },
    { id: "device", label: "Use device theme settings", icon: "device" as const, selected: mode === "device", choose: () => setMode("device") },
    { id: "dark", label: "Dark theme", icon: "moon" as const, selected: mode === "manual" && theme === "dark", choose: () => setTheme("dark") },
  ];
  return <div className="theme-quick-switch" role="group" aria-label="Theme preference">
    {options.map(option => <button type="button" key={option.id} className={`theme-quick-option${option.selected ? " selected" : ""}`} aria-label={option.label} aria-pressed={option.selected} onClick={option.choose}>
      <ThemeIcon className="theme-quick-icon" name={option.icon} />
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
