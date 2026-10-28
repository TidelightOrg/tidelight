"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Ticket = { id: string; ecosystem: "tidelight" | "intelligence" | "packages"; subject: string; status: "open" | "awaiting_user" | "resolved" | "cancelled"; created_at: string; last_activity_at: string };
type Message = { id: string; author_user_id: string | null; author_kind: "requester" | "admin" | "system"; body: string; created_at: string };
type Thread = { ticket: Ticket; messages: Message[] };
type Ecosystem = Ticket["ecosystem"];
const names: Record<Ecosystem, string> = { tidelight: "Tidelight", intelligence: "Intelligence Cloud", packages: "Packages" };
const statuses: Record<Ticket["status"], string> = { open: "Open", awaiting_user: "Reply from you", resolved: "Resolved", cancelled: "Cancelled" };

async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Support is temporarily unavailable.");
  return data as T;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function SupportCenter({ signedIn, email, initialEcosystem, initialTicket, initialCompose }: { signedIn: boolean; email: string | null; initialEcosystem?: string; initialTicket?: string; initialCompose?: boolean }) {
  const ecosystemDefault: Ecosystem = initialEcosystem === "packages" || initialEcosystem === "tidelight" ? initialEcosystem : "intelligence";
  const ecosystemName = names[ecosystemDefault];
  const [tab, setTab] = useState<"home" | "messages">(initialTicket || initialCompose ? "messages" : "home");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<string | null>(initialTicket ?? null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [compose, setCompose] = useState(Boolean(initialCompose));
  const [ecosystem, setEcosystem] = useState<Ecosystem>(ecosystemDefault);
  const [subject, setSubject] = useState(initialCompose ? "Status page issue report" : "");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(signedIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(async () => {
    if (!signedIn) return;
    try { const data = await readJson<{ tickets: Ticket[] }>("/api/developer-support/tickets"); setTickets(data.tickets); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Conversations could not be loaded."); }
    finally { setLoading(false); }
  }, [signedIn]);

  const loadThread = useCallback(async (ticketId: string) => {
    try { setThread(await readJson<Thread>(`/api/developer-support/tickets/${encodeURIComponent(ticketId)}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Conversation could not be opened."); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void loadTickets(); }, 0); return () => window.clearTimeout(timer); }, [loadTickets]);
  useEffect(() => {
    if (!active) return;
    const initial = window.setTimeout(() => { void loadThread(active); }, 0);
    const timer = window.setInterval(() => { void loadThread(active); void loadTickets(); }, 15000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [active, loadThread, loadTickets]);

  async function startTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await readJson<{ ticket: Ticket; notificationState: string }>("/api/developer-support/tickets", { method: "POST", body: JSON.stringify({ ecosystem, subject, message: draft }) });
      setTickets(current => [data.ticket, ...current.filter(ticket => ticket.id !== data.ticket.id)]);
      setActive(data.ticket.id); setCompose(false); setTab("messages"); setSubject(""); setDraft("");
      setNotice(data.notificationState === "sent" ? "Your message is with our developer team. Email alerts were sent to the support operators." : "Your conversation is open. The team will see it in the support inbox shortly.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your message could not be sent."); }
    finally { setBusy(false); }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active || !draft.trim()) return;
    setError(""); setBusy(true);
    try {
      const data = await readJson<{ message: Message }>(`/api/developer-support/tickets/${encodeURIComponent(active)}/messages`, { method: "POST", body: JSON.stringify({ message: draft }) });
      setThread(current => current ? { ...current, messages: [...current.messages, data.message] } : current);
      setDraft(""); await loadTickets();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your reply could not be sent."); }
    finally { setBusy(false); }
  }

  const selected = tickets.find(ticket => ticket.id === active);
  return <>
    <section className="tic-support-heading"><div><p className="tic-eyebrow"><span className="tic-status-dot"/> {ecosystemName.toUpperCase()} / HUMAN SUPPORT</p><h1>We’re here to help<span>.</span></h1><p>Talk with the people building {ecosystemName}. Your conversation stays private to your account.</p></div><div className="tic-support-team"><span className="tic-support-team-mark">T</span><div><strong>{ecosystemName} support</strong><small>Human help from the Tidelight team</small></div><span className="tic-support-presence"><i/> Ready</span></div></section>
    <section className={`tic-support-shell${active ? " has-thread" : ""}`}>
      <aside className={`tic-support-home${tab === "messages" ? " is-active" : ""}`}>
        <div className="tic-support-greeting"><span className="tic-eyebrow">TIDELIGHT SUPPORT DESK</span><h2>Hi there<span aria-hidden="true"> ✦</span><br/>How can we help?</h2><p>Get a clear answer from our developer team.</p></div>
        <button className="tic-support-start" type="button" disabled={!signedIn} onClick={() => { setCompose(true); setActive(null); setTab("messages"); setError(""); }}><span><strong>Start a conversation</strong><small>Usually answered by a Tidelight developer</small></span><b aria-hidden="true">→</b></button>
        {!signedIn ? <Link className="tic-support-signin" href={`/login?next=${encodeURIComponent(`/developers/support?ecosystem=${ecosystem}`)}`}>Sign in to contact support <span aria-hidden="true">→</span></Link> : null}
        <div className="tic-support-health"><span className="tic-support-check" aria-hidden="true">✓</span><div><strong>Support desk available</strong><small>Messages are delivered to the Tidelight team.</small></div></div>
        <div className="tic-support-home-foot"><span>ONE ACCOUNT · THREE SYSTEMS</span><Link href={ecosystemDefault === "tidelight" ? "https://tidelight.app/" : ecosystemDefault === "packages" ? "https://package.tidelight.app/" : "https://tidelight.app/developers"}>Open {ecosystemDefault === "tidelight" ? "Tidelight" : ecosystemDefault === "packages" ? "Packages" : "Intelligence Cloud"} →</Link></div>
      </aside>
      <section className={`tic-support-messages${tab === "messages" ? " is-active" : ""}`} aria-label="Support messages">
        <header className="tic-support-messages-head"><div><p className="tic-eyebrow">YOUR SUPPORT</p><h2>{active && selected ? selected.subject : "Messages"}</h2></div>{active ? <button type="button" onClick={() => { setActive(null); setThread(null); setCompose(false); }}>All conversations</button> : null}</header>
        {compose ? <form className="tic-support-compose" onSubmit={startTicket}>
          <button className="tic-support-back" type="button" onClick={() => setCompose(false)}>← Back</button>
          <p className="tic-eyebrow">START A CONVERSATION</p><h3>Tell us what you’re building.</h3><p className="tic-support-form-note">Share the product area and what happened. Please leave out passwords, API keys, and verification codes.</p>
          <label>System<select value={ecosystem} onChange={event => setEcosystem(event.target.value as Ecosystem)}><option value="intelligence">Intelligence Cloud</option><option value="packages">Packages</option><option value="tidelight">Tidelight</option></select></label>
          <label>Subject<input value={subject} onChange={event => setSubject(event.target.value)} maxLength={140} required placeholder="What do you need help with?" /></label>
          <label>Message<textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={3000} required rows={5} placeholder="Include what you expected and what happened…" /></label>
          <div className="tic-support-form-actions"><span>{email}</span><button className="tic-button tic-primary" type="submit" disabled={busy || !subject.trim() || !draft.trim()}>{busy ? "Sending…" : "Send to support"}<span aria-hidden="true">→</span></button></div>
        </form> : active && thread ? <div className="tic-support-thread">
          <div className="tic-support-thread-meta"><span className={`tic-support-status is-${thread.ticket.status}`}>{statuses[thread.ticket.status]}</span><span>{names[thread.ticket.ecosystem]}</span><span>Updated {formatDate(thread.ticket.last_activity_at)}</span></div>
          <div className="tic-support-message-list" role="log" aria-live="polite">{thread.messages.map(message => <article key={message.id} className={`tic-support-message is-${message.author_kind}`}><div><strong>{message.author_kind === "admin" ? "Tidelight team" : message.author_kind === "system" ? "Support desk" : "You"}</strong><time>{formatDate(message.created_at)}</time></div><p>{message.body}</p></article>)}</div>
          {thread.ticket.status === "resolved" || thread.ticket.status === "cancelled" ? <p className="tic-support-closed-note">This conversation is {statuses[thread.ticket.status].toLowerCase()}. Start a new one if you still need help.</p> : <form className="tic-support-reply" onSubmit={sendReply}><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={3000} rows={2} placeholder="Write a reply…" aria-label="Write a reply" /><button type="submit" disabled={busy || !draft.trim()}>{busy ? "Sending…" : "Send reply"}<span aria-hidden="true">→</span></button></form>}
        </div> : tickets.length ? <div className="tic-support-ticket-list">{tickets.map(ticket => <button type="button" key={ticket.id} onClick={() => { setActive(ticket.id); setTab("messages"); setCompose(false); setNotice(""); }}><span className="tic-support-ticket-icon" aria-hidden="true">↗</span><span className="tic-support-ticket-copy"><strong>{ticket.subject}</strong><small>{names[ticket.ecosystem]} · {formatDate(ticket.last_activity_at)}</small></span><span className={`tic-support-status is-${ticket.status}`}>{statuses[ticket.status]}</span></button>)}</div> : <div className="tic-support-empty"><span aria-hidden="true">✉</span><strong>{loading ? "Loading conversations…" : "No messages yet"}</strong><p>Messages from the Tidelight team will show up here.</p><button type="button" onClick={() => { setCompose(true); setTab("messages"); }} disabled={!signedIn}>Start a conversation <span aria-hidden="true">→</span></button></div>}
      </section>
    </section>
    {notice ? <p className="tic-support-notice" role="status">{notice}</p> : null}{error ? <p className="tic-support-error" role="alert">{error}</p> : null}
    <nav className="tic-support-mobile-tabs" aria-label="Support sections"><button type="button" className={tab === "home" ? "active" : ""} aria-current={tab === "home" ? "page" : undefined} onClick={() => { setTab("home"); setCompose(false); }}><span aria-hidden="true">⌂</span>Home</button><button type="button" className={tab === "messages" ? "active" : ""} aria-current={tab === "messages" ? "page" : undefined} onClick={() => { setTab("messages"); setCompose(false); }}><span aria-hidden="true">▤</span>Messages{tickets.length ? <i>{tickets.length}</i> : null}</button></nav>
  </>;
}
