"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const MEASUREMENT_ID = "G-JOP7HOTN38";
const CONSENT_KEY = "tidelight-analytics-consent-v1";
type Choice = "accepted" | "rejected" | "neutral";

function validChoice(value: unknown): value is Choice { return value === "accepted" || value === "rejected" || value === "neutral"; }

function enableAnalytics() {
  if (document.getElementById("tidelight-google-analytics")) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  window.gtag("consent", "default", {
    analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  });
  window.gtag("consent", "update", { analytics_storage: "granted" });
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
  const script = document.createElement("script");
  script.id = "tidelight-google-analytics";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

declare global {
  interface Window { dataLayer?: unknown[][]; gtag?: (...args: unknown[]) => void; }
}

export default function AnalyticsConsent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);
  const [accountChoice, setAccountChoice] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const local = window.localStorage.getItem(CONSENT_KEY);
    const apply = (choice: Choice) => {
      window.localStorage.setItem(CONSENT_KEY, choice);
      if (choice === "accepted") enableAnalytics();
      if (active) { setOpen(false); setHasChoice(true); setResolved(true); }
    };
    void (async () => {
      try {
        const response = await fetch("/api/privacy/analytics-consent", { cache: "no-store" });
        if (response.status === 401) {
          if (!active) return;
          setAccountChoice(false);
          if (validChoice(local)) { if (local === "accepted") enableAnalytics(); setHasChoice(true); }
          else setOpen(true);
          setResolved(true);
          return;
        }
        if (!response.ok) throw new Error("Account privacy settings are unavailable.");
        const data = await response.json() as { choice?: unknown };
        if (!active) return;
        setAccountChoice(true);
        if (validChoice(data.choice)) { apply(data.choice); return; }
        if (validChoice(local)) {
          if (local === "neutral") { apply(local); return; }
          const saved = await fetch("/api/privacy/analytics-consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: local }) });
          if (active) apply(local);
          if (saved.ok) return;
          return;
        }
        setOpen(true);
        setResolved(true);
      } catch {
        if (!active) return;
        setAccountChoice(null);
        if (validChoice(local)) { if (local === "accepted") enableAnalytics(); setHasChoice(true); }
        else setOpen(true);
        setResolved(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open || interacted || saving) return;
    const timeout = window.setTimeout(() => setOpen(false), 6_000);
    return () => window.clearTimeout(timeout);
  }, [open, interacted, saving]);

  const saveChoice = useCallback(async (next: Choice) => {
    setInteracted(true);
    setSaving(true);
    setError("");
    try {
      if (next !== "neutral" && accountChoice !== false) {
        const response = await fetch("/api/privacy/analytics-consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: next }) });
        if (!(accountChoice === null && response.status === 401) && !response.ok) throw new Error("We couldn’t save this choice to your account. Please try again.");
      }
      window.localStorage.setItem(CONSENT_KEY, next);
      setOpen(false);
      setHasChoice(true);
      if (next === "accepted") enableAnalytics();
      else window.gtag?.("consent", "update", { analytics_storage: "denied" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t save your privacy choice. Please try again.");
    } finally { setSaving(false); }
  }, [accountChoice]);

  if (pathname === "/judge" || pathname === "/evidence" || pathname === "/replay") return null;

  return <>
    {resolved && !open && !hasChoice && <button className={`analytics-privacy-trigger${pathname === "/futures" || pathname === "/trading" || pathname === "/flow" || pathname === "/markets" ? " is-dense-workspace" : ""}`} type="button" onClick={() => { setInteracted(false); setOpen(true); }}>Privacy choices</button>}
    {open && <section className="analytics-consent" aria-label="Analytics privacy choices" aria-live="polite">
      <div className="analytics-consent-accent" aria-hidden="true"><span /></div>
      <div className="analytics-consent-heading">
        <span className="analytics-consent-mark" aria-hidden="true"><span /></span>
        <span className="analytics-consent-eyebrow">TIDELIGHT · PRIVACY</span>
        <strong>Your research stays private.</strong>
        <p>Optional usage analytics helps us improve Tidelight. It stays off unless you allow it.</p>
      </div>
      {error && <p role="alert" className="analytics-consent-error">{error}</p>}
      <div className="analytics-consent-actions">
        <button type="button" className="analytics-consent-neutral" disabled={saving} onClick={() => void saveChoice("neutral")}>Not now</button>
        <button type="button" className="analytics-consent-reject" disabled={saving} onClick={() => void saveChoice("rejected")}>{saving ? "Saving…" : "Reject"}</button>
        <button type="button" className="analytics-consent-accept" disabled={saving} onClick={() => void saveChoice("accepted")}>{saving ? "Saving…" : "Allow analytics"}</button>
      </div>
      {!interacted && <p className="analytics-consent-timer">This notice closes automatically in 6 seconds.</p>}
    </section>}
    <style jsx global>{`
      .analytics-consent{box-sizing:border-box;position:fixed;z-index:10000;right:18px;top:94px;left:auto;bottom:auto;transform:none;width:min(340px,calc(100vw - 36px));padding:19px 20px 15px;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent,#75e4c2) 32%,var(--line));border-radius:20px;background:color-mix(in srgb,var(--panel,#f8fbf8) 93%,transparent);box-shadow:0 18px 54px #071e1830,0 2px 10px #071e1814;color:var(--text);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
      .analytics-consent-accent{position:absolute;inset:0 0 auto;height:2px;background:color-mix(in srgb,var(--accent,#75e4c2) 17%,transparent)}.analytics-consent-accent span{display:block;width:100%;height:100%;transform-origin:left;background:var(--accent,#75e4c2);animation:analytics-consent-countdown 6s linear forwards}
      @media(max-width:600px){.analytics-consent{top:auto;bottom:82px;left:14px;right:14px;width:auto}}\n      @keyframes analytics-consent-countdown{to{transform:scaleX(0)}}
      .analytics-consent-heading{display:grid;grid-template-columns:28px 1fr;column-gap:10px;align-items:center}.analytics-consent-mark{grid-row:1/3;display:grid;place-items:center;width:28px;height:28px;border:1px solid color-mix(in srgb,var(--accent,#75e4c2) 44%,var(--line));border-radius:9px;color:var(--accent,#75e4c2)}.analytics-consent-mark span{position:relative;width:9px;height:9px;border-radius:50%;background:var(--accent,#75e4c2);box-shadow:0 0 12px color-mix(in srgb,var(--accent,#75e4c2) 70%,transparent)}.analytics-consent-mark span:after{content:"";position:absolute;inset:-4px;border:1px solid color-mix(in srgb,var(--accent,#75e4c2) 54%,transparent);border-radius:50%}.analytics-consent-eyebrow{color:var(--muted);font:600 9px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em}.analytics-consent-heading strong{grid-column:2;margin-top:12px;font-size:17px;letter-spacing:-.035em}.analytics-consent-heading p{grid-column:2;margin:6px 0 0;color:var(--muted);font-size:12px;line-height:1.55}
      .analytics-consent-error{margin:12px 0 0;color:#b94855;font-size:12px;line-height:1.45}
      .analytics-consent-actions{display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:7px;margin-top:17px}.analytics-consent-actions button,.analytics-privacy-trigger{box-sizing:border-box;border:1px solid var(--line);border-radius:999px;padding:10px 11px;background:color-mix(in srgb,var(--panel,#f8fbf8) 82%,transparent);color:var(--text);font-family:inherit;font-size:11px;font-weight:600;line-height:1.2;cursor:pointer;white-space:nowrap;transition:background .18s ease,border-color .18s ease,transform .18s ease}.analytics-consent-actions button:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--accent,#75e4c2) 50%,var(--line))}.analytics-consent-actions .analytics-consent-accept{border-color:var(--accent,#75e4c2);background:var(--accent,#75e4c2);color:#08251e}.analytics-consent-actions button:disabled{opacity:.6;cursor:wait;transform:none}
      .analytics-consent-timer{margin:11px 0 0;color:var(--muted);font-size:10px;line-height:1.4;text-align:center}
      .analytics-consent-actions button:focus-visible,.analytics-privacy-trigger:focus-visible{outline:3px solid var(--accent,#6b8cff);outline-offset:3px}
      .analytics-privacy-trigger{position:fixed;z-index:9998;right:150px;bottom:14px;background:var(--panel);box-shadow:0 3px 14px #0002;font-size:10px}.analytics-privacy-trigger.is-dense-workspace{display:none}
      @media(max-width:440px){.analytics-consent{bottom:16px;padding:17px 16px 13px;border-radius:18px}.analytics-consent-actions{grid-template-columns:1fr 1fr}.analytics-consent-actions .analytics-consent-accept{grid-column:1/-1;grid-row:2}.analytics-consent-actions .analytics-consent-neutral{grid-column:1;grid-row:1}.analytics-consent-actions .analytics-consent-reject{grid-column:2;grid-row:1}}
      @media(prefers-reduced-motion:reduce){.analytics-consent-accent span{animation:none;transform:scaleX(.25)}.analytics-consent-actions button{transition:none}}
    `}</style>
  </>;
}
