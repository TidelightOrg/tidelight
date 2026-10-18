"use client";

import { useCallback, useEffect, useState } from "react";

type Ticket = { id: string; requester_user_id: string; requester_email: string; ecosystem: string; subject: string; status: "open" | "awaiting_user" | "resolved" | "cancelled"; admin_notification_state: string; created_at: string; last_activity_at: string };
type Message = { id: string; author_user_id: string | null; author_kind: "requester" | "admin" | "system"; body: string; created_at: string };
type Thread = { ticket: Ticket; messages: Message[] };
const statusLabel: Record<Ticket["status"], string> = { open: "Open", awaiting_user: "Awaiting user", resolved: "Resolved", cancelled: "Cancelled" };
const ecosystemLabel: Record<string, string> = { tidelight: "Tidelight", intelligence: "Intelligence Cloud", packages: "Packages" };

async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "The support queue is unavailable.");
  return data as T;
}

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function DeveloperSupportAdmin({ initialTicket, operatorEmail }: { initialTicket: string | null; operatorEmail: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState(initialTicket);
  const [thread, setThread] = useState<Thread | null>(null);
  const [filter, setFilter] = useState("active");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(async () => {
    try { const data = await readJson<{ tickets: Ticket[] }>(`/api/admin/developer-support/tickets${filter === "all" ? "" : `?status=${filter}`}`); setTickets(data.tickets); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The support queue could not be loaded."); }
  }, [filter]);

  const loadThread = useCallback(async (ticketId: string) => {
    try { setThread(await readJson<Thread>(`/api/developer-support/tickets/${encodeURIComponent(ticketId)}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The conversation could not be opened."); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void loadTickets(); }, 0); return () => window.clearTimeout(timer); }, [loadTickets]);
  useEffect(() => {
    if (!active) return;
    const initial = window.setTimeout(() => { void loadThread(active); }, 0);
    const timer = window.setInterval(() => { void loadThread(active); void loadTickets(); }, 15000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [active, loadThread, loadTickets]);

  async function updateStatus(status: Ticket["status"]) {
    if (!active) return;
    setBusy(true); setError("");
    try { await readJson(`/api/developer-support/tickets/${encodeURIComponent(active)}`, { method: "PATCH", body: JSON.stringify({ status }) }); setNotice(`Conversation marked ${statusLabel[status].toLowerCase()}.`); await loadThread(active); await loadTickets(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status could not be updated."); }
    finally { setBusy(false); }
  }

  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active || !draft.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try { const data = await readJson<{ message: Message }>(`/api/developer-support/tickets/${encodeURIComponent(active)}/messages`, { method: "POST", body: JSON.stringify({ message: draft }) }); setThread(current => current ? { ...current, messages: [...current.messages, data.message] } : current); setDraft(""); await loadTickets(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Reply could not be sent."); }
    finally { setBusy(false); }
  }

  const visibleTickets = tickets.filter(ticket => !search.trim() || `${ticket.subject} ${ticket.requester_email} ${ecosystemLabel[ticket.ecosystem]}`.toLowerCase().includes(search.toLowerCase()));
  const activeTicket = thread?.ticket ?? tickets.find(ticket => ticket.id === active) ?? null;
  return <>
    <section className="tic-support-admin-stats"><article><span>IN QUEUE</span><strong>{tickets.filter(ticket => ticket.status === "open" || ticket.status === "awaiting_user").length}</strong><small>Active conversations in this view</small></article><article><span>ECOSYSTEMS</span><strong>03</strong><small>Tidelight · Cloud · Packages</small></article><article><span>OPERATOR</span><strong className="tic-support-admin-operator">{operatorEmail}</strong><small>Verified support access</small></article></section>
    <section className={`tic-support-admin-workspace${active ? " has-selection" : ""}`}>
      <aside className={`tic-support-admin-queue${active ? " is-hidden-mobile" : ""}`}>
        <div className="tic-support-admin-queue-head"><div><p className="tic-eyebrow">INBOX / {visibleTickets.length.toString().padStart(2,"0")}</p><h2>Conversations</h2></div><button type="button" onClick={() => void loadTickets()} aria-label="Refresh support inbox">↻</button></div>
        <label className="tic-support-admin-search"><span className="sr-only">Search support conversations</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people or topics" /></label>
        <div className="tic-support-admin-filters">{["active", "resolved", "cancelled", "all"].map(value => <button type="button" key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => { setFilter(value); setActive(null); }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
        <div className="tic-support-admin-list">{visibleTickets.length ? visibleTickets.map(ticket => <button type="button" key={ticket.id} className={active === ticket.id ? "active" : ""} onClick={() => { setActive(ticket.id); setNotice(""); }}><span className="tic-support-admin-avatar">{ecosystemLabel[ticket.ecosystem]?.slice(0,1) ?? "T"}</span><span className="tic-support-admin-ticket-main"><strong>{ticket.subject}</strong><small>{ticket.requester_email}</small><small>{ecosystemLabel[ticket.ecosystem]} · {formatDate(ticket.last_activity_at)}</small></span><i className={`tic-support-admin-status is-${ticket.status}`}/></button>) : <p className="tic-support-admin-empty">No conversations in this view.</p>}</div>
      </aside>
      <section className={`tic-support-admin-thread${active ? " is-visible-mobile" : ""}`} aria-label="Selected support conversation">
        {!activeTicket ? <div className="tic-support-admin-empty-state"><span>SUPPORT / OPERATIONS</span><strong>Select a conversation</strong><p>Choose a ticket to review its full thread, reply to the user, or update its status.</p></div> : <>
          <header className="tic-support-admin-thread-head"><button type="button" className="tic-support-admin-back" onClick={() => setActive(null)}>← Inbox</button><div><span className={`tic-support-status is-${activeTicket.status}`}>{statusLabel[activeTicket.status]}</span><span>{ecosystemLabel[activeTicket.ecosystem]}</span></div><h2>{activeTicket.subject}</h2><p>{activeTicket.requester_email} · Opened {formatDate(activeTicket.created_at)}</p></header>
          <div className="tic-support-admin-actions"><span>Email alert: <b>{activeTicket.admin_notification_state}</b></span>{activeTicket.status !== "resolved" ? <button type="button" disabled={busy} onClick={() => void updateStatus("resolved")}>Mark resolved</button> : <button type="button" disabled={busy} onClick={() => void updateStatus("open")}>Reopen</button>}{activeTicket.status !== "cancelled" ? <button type="button" className="is-quiet" disabled={busy} onClick={() => void updateStatus("cancelled")}>Cancel ticket</button> : null}</div>
          <div className="tic-support-admin-messages" role="log" aria-live="polite">{thread?.messages.map(message => <article key={message.id} className={`tic-support-admin-message is-${message.author_kind}`}><div><strong>{message.author_kind === "admin" ? "Tidelight team" : message.author_kind === "system" ? "Support desk" : "Requester"}</strong><time>{formatDate(message.created_at)}</time></div><p>{message.body}</p></article>)}</div>
          {activeTicket.status === "cancelled" ? <p className="tic-support-admin-closed">This ticket is cancelled.</p> : <form className="tic-support-admin-reply" onSubmit={reply}><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={3000} rows={3} placeholder="Write an answer for the user…" aria-label="Write a support reply" /><div><span>Replying as {operatorEmail}</span><button type="submit" disabled={busy || !draft.trim()}>{busy ? "Sending…" : "Send reply"}<span aria-hidden="true">→</span></button></div></form>}
        </>}
      </section>
    </section>
    {notice ? <p className="tic-support-admin-notice" role="status">{notice}</p> : null}{error ? <p className="tic-support-admin-error" role="alert">{error}</p> : null}
  </>;
}
