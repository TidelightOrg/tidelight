"use client";

import { useState } from "react";

export default function StrategyReplayShare({ runId }: { runId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  async function publish() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/strategy-replays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Could not publish this strategy replay.");
      setUrl(new URL(data.url, window.location.origin).toString()); setExpiresAt(String(data.expiresAt ?? ""));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not publish this strategy replay."); }
    finally { setBusy(false); }
  }
  async function revoke() {
    setBusy(true); setError("");
    try {
      const token = url.split("/").at(-1);
      const response = await fetch(`/api/strategy-replays/${encodeURIComponent(token ?? "")}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke this replay.");
      setUrl(""); setExpiresAt(""); setError("Public link revoked.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke this replay."); }
    finally { setBusy(false); }
  }
  return <div className="strategy-public-share"><div><b>Public evidence</b><span>Anyone with the link can view the symbol, rule, date window, reported metrics, candle archive, and assumptions. Public for 30 days; account and portfolio details are excluded.</span></div>{url ? <><a href={url} target="_blank" rel="noreferrer">Open replay ↗</a><button type="button" disabled={busy} onClick={() => void navigator.clipboard.writeText(url).then(() => setError("Link copied.")).catch(() => setError("Copy failed; open the replay and copy its address."))}>Copy link</button><button type="button" disabled={busy} onClick={() => void revoke()}>{busy ? "Revoking…" : "Revoke"}</button><small>Expires {expiresAt ? new Date(expiresAt).toLocaleString() : "in 30 days"}</small></> : <button type="button" disabled={busy} onClick={() => void publish()}>{busy ? "Preparing replay…" : "Publish replay ↗"}</button>}{error ? <small role="status">{error}</small> : null}</div>;
}
