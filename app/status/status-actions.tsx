"use client";
import { useEffect, useRef, useState } from "react";

const componentOptions = ["Tidelight app","Developer docs","Package directory","REST API","Research job API","MCP server metadata","npm registry","Python package registry","Application database","Research job processing","Scheduled paper analysis","Webhook delivery","Email delivery"];

export function StatusActions() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus();
      const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
      window.addEventListener("keydown", dismiss);
      return () => window.removeEventListener("keydown", dismiss);
    }
    if (wasOpen.current) { wasOpen.current = false; triggerRef.current?.focus(); }
  }, [open]);
  const [tab, setTab] = useState<"email"|"feeds"|"slack">("email");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/status/subscriptions", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ email, components: selected, website: "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Subscription could not be saved.");
      setMessage(result.message || "Check your inbox to confirm your subscription.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Subscription could not be saved."); }
    finally { setBusy(false); }
  }

  const rss = typeof window !== "undefined" ? window.location.origin + "/feed.rss" : "/feed.rss";
  const atom = typeof window !== "undefined" ? window.location.origin + "/feed.atom" : "/feed.atom";
  if (!open) return <div className="tic-status-actions">
    <a href="https://tidelight.app/developers/support?ecosystem=tidelight%26new=incident" className="tic-status-report">Report a problem</a>
    <button ref={triggerRef} type="button" className="tic-status-subscribe" onClick={() => setOpen(true)}>Subscribe to updates</button>
  </div>;

  return <div className="tic-status-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <section className="tic-status-modal" role="dialog" aria-modal="true" aria-labelledby="status-subscribe-title">
      <header><h2 id="status-subscribe-title">Subscribe to updates</h2><button ref={closeRef} type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button></header>
      <div className="tic-status-tabs" role="tablist" aria-label="Notification method">
        <button type="button" role="tab" aria-selected={tab==="email"} onClick={() => setTab("email")}>Email</button>
        <button type="button" role="tab" aria-selected={tab==="feeds"} onClick={() => setTab("feeds")}>RSS / Atom</button>
        <button type="button" role="tab" aria-selected={tab==="slack"} onClick={() => setTab("slack")}>Slack</button>
      </div>
      {tab === "email" ? <form className="tic-status-subscribe-form" onSubmit={subscribe}>
        <label>Email address<input type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <details className="tic-status-component-picker"><summary>Choose specific services{selected.length ? ` (${selected.length})` : ""}</summary><div>{componentOptions.map(name => <label key={name}><input type="checkbox" checked={selected.includes(name)} onChange={e => setSelected(current => e.target.checked ? [...current,name] : current.filter(value => value!==name))}/>{name}</label>)}</div><small>Leave all unchecked to receive updates for every service.</small></details>
        <p className="tic-status-consent">You’ll receive email for newly detected incidents and when they are resolved. Confirm by email; unsubscribe at any time.</p>
        {message && <p className="tic-status-form-success" role="status">{message}</p>}{error && <p className="tic-status-form-error" role="alert">{error}</p>}
        <footer><button type="submit" disabled={busy}>{busy ? "Sending…" : "Subscribe"}</button></footer>
      </form> : tab === "feeds" ? <div className="tic-status-feed-links"><p>Follow Tidelight incident updates in any RSS or Atom reader.</p><label>RSS feed<input readOnly value={rss} onFocus={e=>e.currentTarget.select()}/></label><label>Atom feed<input readOnly value={atom} onFocus={e=>e.currentTarget.select()}/></label></div> : <div className="tic-status-feed-links"><p>In your Slack channel, add the RSS app and run:</p><code>/feed subscribe {rss}</code><p>Slack will post new and resolved incident updates to that channel. You can also use the RSS URL in any compatible feed integration, including Telegram RSS bots.</p></div>}
    </section>
  </div>;
}
