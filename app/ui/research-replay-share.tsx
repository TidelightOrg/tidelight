"use client";

import { useState } from "react";

type ReplayLink = { url: string; createdAt: string; expiresAt: string; revoked: boolean; expired: boolean; question: string };

export default function ResearchReplayShare({ researchRunId }: { researchRunId?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [links, setLinks] = useState<ReplayLink[]>([]);

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
    <div className="replay-share-triggers">{researchRunId ? <button className="replay-share-trigger" type="button" onClick={() => { setError(""); setOpen(true); }}>{url ? "Manage public replay" : "Publish a public replay ↗"}</button> : null}<button className="replay-share-manage" type="button" onClick={() => { setOpen(true); void loadLinks(); }}>Your shared replays</button></div>
    {open ? <div className="replay-share-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><section className="replay-share-dialog" role="dialog" aria-modal="true" aria-labelledby="replay-share-title"><button className="replay-share-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button><span className="flow-kicker">TIDELIGHT / RESEARCH PROOF</span><h2 id="replay-share-title">Make this run inspectable.</h2>{url ? <><p>This replay is public until {expiresAt ? new Date(expiresAt).toLocaleString() : "its 30-day expiry"}. You can revoke it at any time.</p><label htmlFor="research-replay-url">Public replay link</label><input id="research-replay-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /><div className="replay-share-actions"><button type="button" onClick={() => void navigator.clipboard.writeText(url).then(() => setError("Link copied.")).catch(() => setError("Select the link above and copy it."))}>Copy link</button><button type="button" disabled={busy} onClick={() => void revoke()}>{busy ? "Revoking…" : "Revoke link"}</button></div></> : <><p>Anyone with the link can see this research question, its AI summary, cited public sources, market snapshot, confidence label, risk gates, and captured process steps.</p><div className="replay-share-boundary"><b>Private details excluded</b><span>Your name, email, account data, workspace route, portfolio, credentials, and order controls are not included. The replay expires after 30 days and can be revoked.</span></div><div className="replay-share-actions">{researchRunId ? <button type="button" disabled={busy} onClick={() => void publish()}>{busy ? "Preparing replay…" : "Publish this research run"}</button> : null}<button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div></>}{links.length > 0 ? <div className="replay-share-link-list"><h3>Your published links</h3>{links.map(link => <article key={link.url}><div><b>{link.question}</b><small>Published {new Date(link.createdAt).toLocaleDateString()} · expires {new Date(link.expiresAt).toLocaleDateString()}</small></div><div>{link.revoked || link.expired ? <span>Unavailable</span> : <><a href={link.url} target="_blank" rel="noreferrer">Open ↗</a><button type="button" disabled={busy} onClick={() => void revokeLink(link)}>Revoke</button></>}</div></article>)}</div> : null}{error ? <p className="replay-share-message" role="status">{error}</p> : null}</section></div> : null}
    <style jsx>{` .replay-share-triggers{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.replay-share-trigger,.replay-share-manage{padding:9px 12px;border:1px solid color-mix(in srgb,var(--brand-teal) 42%,var(--line));border-radius:999px;background:color-mix(in srgb,var(--panel) 76%,transparent);color:var(--text);font:600 10px var(--mono);cursor:pointer}.replay-share-manage{background:transparent;color:var(--muted)}.replay-share-backdrop{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:18px;background:#03100ecc;backdrop-filter:blur(9px)}.replay-share-dialog{position:relative;width:min(520px,100%);max-height:min(88dvh,760px);overflow:auto;padding:clamp(22px,5vw,34px);border:1px solid color-mix(in srgb,var(--brand-teal) 40%,var(--line));border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--panel) 91%,#9af3d3 9%),color-mix(in srgb,var(--background) 92%,#3a7266 8%));box-shadow:0 28px 100px #0008;color:var(--text);backdrop-filter:blur(28px) saturate(145%)}.replay-share-dialog h2{margin:10px 30px 10px 0;font:650 clamp(25px,6vw,34px)/1.05 var(--display);letter-spacing:-.045em}.replay-share-dialog>p{color:var(--muted);font:13px/1.65 var(--font)}.replay-share-close{position:absolute;right:15px;top:12px;width:34px;height:34px;border:1px solid var(--line);border-radius:50%;background:color-mix(in srgb,var(--panel) 66%,transparent);color:var(--text);font-size:21px;cursor:pointer}.replay-share-boundary{display:grid;gap:6px;margin:17px 0;padding:13px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--panel) 54%,transparent);font-size:11px;line-height:1.6}.replay-share-boundary span{color:var(--muted)}.replay-share-dialog label{display:block;margin:16px 0 7px;font:10px var(--mono)}.replay-share-dialog input{box-sizing:border-box;width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;background:color-mix(in srgb,var(--background) 80%,transparent);color:var(--text);font:11px var(--mono)}.replay-share-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:19px}.replay-share-actions button,.replay-share-link-list button{min-height:40px;padding:0 14px;border:1px solid color-mix(in srgb,var(--brand-teal) 40%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--brand-teal) 17%,var(--panel));color:var(--text);font:600 11px var(--font);cursor:pointer}.replay-share-actions button:disabled,.replay-share-link-list button:disabled{opacity:.55;cursor:wait}.replay-share-link-list{margin-top:22px;padding-top:17px;border-top:1px solid var(--line)}.replay-share-link-list h3{margin:0 0 10px;font:600 12px var(--mono)}.replay-share-link-list article{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}.replay-share-link-list article>div:first-child{display:grid;gap:5px}.replay-share-link-list small,.replay-share-link-list article>div:last-child{color:var(--muted);font-size:10px}.replay-share-link-list article>div:last-child{display:flex;align-items:center;gap:9px;white-space:nowrap}.replay-share-link-list a{color:var(--brand-teal)}.replay-share-link-list button{min-height:30px;padding:0 9px}.replay-share-message{margin:12px 0 0;color:var(--muted);font-size:11px}`}</style>
  </div>;
}
