"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ReplayLink = { url: string; createdAt: string; expiresAt: string; revoked: boolean; expired: boolean; question: string };

export default function ResearchReplayShare({ researchRunId }: { researchRunId?: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [links, setLinks] = useState<ReplayLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (event.key === "Escape" && !busy) { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, open]);

  async function publish() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/research/replays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ researchRunId }) });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Could not publish this replay.");
      setUrl(new URL(data.url, window.location.origin).toString());
      setExpiresAt(String(data.expiresAt ?? ""));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not publish this replay."); }
    finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true); setError("");
    try {
      const token = url.split("/").at(-1);
      const response = await fetch(`/api/research/replays/${encodeURIComponent(token ?? "")}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke this replay.");
      setUrl(""); setExpiresAt(""); setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke this replay."); }
    finally { setBusy(false); }
  }

  async function loadLinks() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/research/replays", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.replays)) throw new Error(data.error || "Could not load replay links.");
      setLinks(data.replays);
      setLinksLoaded(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load replay links."); }
    finally { setBusy(false); }
  }

  async function revokeLink(link: ReplayLink) {
    setBusy(true); setError("");
    try {
      const token = link.url.split("/").at(-1);
      const response = await fetch(`/api/research/replays/${encodeURIComponent(token ?? "")}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke this replay.");
      setLinks(current => current.map(item => item.url === link.url ? { ...item, revoked: true } : item));
      if (url.endsWith(token ?? "")) { setUrl(""); setExpiresAt(""); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke this replay."); }
    finally { setBusy(false); }
  }

  return <div className="replay-share-control">
    <div className="replay-share-triggers">{researchRunId ? <button className="replay-share-trigger" type="button" onClick={() => { setError(""); setOpen(true); }}>{url ? "Manage replay" : "Publish replay ↗"}</button> : null}<button className="replay-share-manage" type="button" onClick={() => { setOpen(true); void loadLinks(); }}>Your shared replays.</button></div>
    {open ? createPortal(<div className="replay-share-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><section ref={dialogRef} tabIndex={-1} className="replay-share-dialog" role="dialog" aria-modal="true" aria-labelledby="replay-share-title"><button className="replay-share-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button><span className="flow-kicker">RESEARCH REPLAY</span><h2 id="replay-share-title">{researchRunId ? "Publish this research run" : "Shared replays"}</h2>{url ? <><p>This link expires {expiresAt ? new Date(expiresAt).toLocaleString() : "after 30 days"} and can be revoked at any time.</p><label htmlFor="research-replay-url">Public replay link</label><input id="research-replay-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /><div className="replay-share-actions"><button type="button" onClick={() => void navigator.clipboard.writeText(url).then(() => setError("Link copied.")).catch(() => setError("Select the link above and copy it."))}>Copy link</button><button type="button" disabled={busy} onClick={() => void revoke()}>{busy ? "Revoking…" : "Revoke link"}</button></div></> : researchRunId ? <><p>The link shares this question, summary, cited sources, market snapshot, confidence, risk gates, and completed research steps.</p><div className="replay-share-boundary"><b>Public link</b><span>Anyone with the link can see this research question and its published evidence. Account identity, workspace details, portfolio data, credentials, and order controls stay private. The link expires after 30 days and can be revoked.</span></div><div className="replay-share-actions"><button type="button" disabled={busy} onClick={() => void publish()}>{busy ? "Preparing replay…" : "Publish replay"}</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div></> : <><p>Open or revoke a research replay.</p><div className="replay-share-actions"><button type="button" disabled={busy} onClick={() => setOpen(false)}>Close</button></div></>}{linksLoaded ? <div className="replay-share-link-list"><h3>Published replays</h3>{links.length === 0 ? <p>No public replays yet.</p> : null}{links.map(link => <article key={link.url}><div><b>{link.question}</b><small>Published {new Date(link.createdAt).toLocaleDateString()} · expires {new Date(link.expiresAt).toLocaleDateString()}</small></div><div>{link.revoked || link.expired ? <span>Unavailable</span> : <><a href={link.url} target="_blank" rel="noreferrer">Open ↗</a><button type="button" disabled={busy} onClick={() => void revokeLink(link)}>Revoke</button></>}</div></article>)}</div> : null}{error ? <p className="replay-share-message" role="status">{error}</p> : null}</section></div>, document.body) : null}
    <style jsx>{` .replay-share-triggers{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.replay-share-trigger,.replay-share-manage{padding:9px 12px;border:1px solid color-mix(in srgb,var(--brand-teal) 42%,var(--line));border-radius:999px;background:color-mix(in srgb,var(--panel) 76%,transparent);color:var(--text);font:600 10px var(--mono);cursor:pointer}.replay-share-manage{background:transparent;color:var(--muted)}.replay-share-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(9px)}.replay-share-dialog{position:relative;width:min(520px,100%);max-height:min(88dvh,760px);overflow:auto;padding:clamp(22px,5vw,34px);border:1px solid color-mix(in srgb,var(--brand-teal) 40%,var(--line));border-radius:22px;background:var(--panel);box-shadow:0 28px 100px #0008;color:var(--text);backdrop-filter:blur(8px) saturate(110%)}.replay-share-dialog h2{margin:10px 30px 10px 0;font:650 clamp(25px,6vw,34px)/1.05 var(--display);letter-spacing:-.045em;color:var(--text)}.replay-share-dialog>p{color:var(--muted);font:13px/1.65 var(--font)}.replay-share-close{position:absolute;right:15px;top:12px;width:34px;height:34px;border:1px solid var(--line);border-radius:50%;background:color-mix(in srgb,var(--panel) 66%,transparent);color:var(--muted);font-size:21px;cursor:pointer}.replay-share-boundary{display:grid;gap:6px;margin:17px 0;padding:13px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--panel) 54%,transparent);font-size:11px;line-height:1.6;color:var(--text)}.replay-share-boundary span{color:var(--muted)}.replay-share-dialog label{display:block;margin:16px 0 7px;font:10px var(--mono);color:var(--text)}.replay-share-dialog input{box-sizing:border-box;width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;background:color-mix(in srgb,var(--bg) 80%,transparent);color:var(--text);font:11px var(--mono)}.replay-share-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:19px}.replay-share-actions button,.replay-share-link-list button{min-height:40px;padding:0 14px;border:1px solid color-mix(in srgb,var(--brand-teal) 40%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--brand-teal) 17%,var(--panel));color:var(--text);font:600 11px var(--font);cursor:pointer}.replay-share-actions button:last-child{border-color:var(--line);background:var(--panel-2);color:var(--text)}.replay-share-actions button:disabled,.replay-share-link-list button:disabled{opacity:.55;cursor:wait}.replay-share-link-list{margin-top:22px;padding-top:17px;border-top:1px solid var(--line)}.replay-share-link-list h3{margin:0 0 10px;font:600 12px var(--mono);color:var(--text)}.replay-share-link-list article{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}.replay-share-link-list article>div:first-child{display:grid;gap:5px}.replay-share-link-list small,.replay-share-link-list article>div:last-child{color:var(--muted);font-size:10px}.replay-share-link-list article>div:last-child{display:flex;align-items:center;gap:9px;white-space:nowrap}.replay-share-link-list a{color:var(--mint)}.replay-share-link-list button{min-height:30px;padding:0 9px}.replay-share-message{margin:12px 0 0;color:var(--muted);font-size:11px;color:var(--muted)}.replay-share-dialog{isolation:isolate}.replay-share-dialog:before{content:"";position:absolute;inset:0 0 auto;height:2px;border-radius:22px 22px 0 0;background:linear-gradient(90deg,var(--brand-teal),color-mix(in srgb,var(--brand-teal) 8%,transparent));pointer-events:none}@media(prefers-reduced-motion:reduce){.replay-share-dialog,.replay-share-backdrop{scroll-behavior:auto;transition:none}}`}</style>
  </div>;
}
