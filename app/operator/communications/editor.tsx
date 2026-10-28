"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { EditorialPost, MaintenanceNotice } from "@/lib/tic/editorial-content";

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIsoTimestamp(value: FormDataEntryValue | undefined) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: "grid", gap: 7, margin: "12px 0", fontWeight: 600 }}>{label}{children}</label>;
}

export function CommunicationsEditor({ initialMaintenance, initialPosts }: { initialMaintenance: MaintenanceNotice[]; initialPosts: EditorialPost[] }) {
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [maintenanceOffset, setMaintenanceOffset] = useState(initialMaintenance.length);
  const [posts, setPosts] = useState(initialPosts);
  const [postsOffset, setPostsOffset] = useState(initialPosts.length);
  const [maintenanceHasMore, setMaintenanceHasMore] = useState(initialMaintenance.length === 50);
  const [postsHaveMore, setPostsHaveMore] = useState(initialPosts.length === 50);
  const [maintenanceVisible, setMaintenanceVisible] = useState(12);
  const [postsVisible, setPostsVisible] = useState(12);
  const [loadingMore, setLoadingMore] = useState<"maintenance" | "blog" | null>(null);
  const paginationGeneration = useRef({ maintenance: 0, blog: 0 });
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceNotice | null>(null);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolvingMaintenanceId, setResolvingMaintenanceId] = useState<string | null>(null);

  async function resolveMaintenance(item: MaintenanceNotice) {
    setResolvingMaintenanceId(item.id);
    setMaintenanceMessage("");
    try {
      const response = await fetch("/api/operator/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "maintenance", action: "resolve", id: item.id }),
      });
      const result = await response.json() as { item?: MaintenanceNotice; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error ?? "Maintenance could not be marked resolved.");
      const refreshed = await refreshList("maintenance");
      if (!refreshed) {
        setMaintenance(current => current.map(existing => existing.id === result.item!.id ? result.item! : existing));
        setMaintenanceHasMore(false);
      }
      setMaintenanceMessage(refreshed
        ? "Maintenance marked resolved and moved to history."
        : "Maintenance was resolved, but the list could not refresh. Reload this page to see the update.");
    } catch (error) {
      setMaintenanceMessage(error instanceof Error ? error.message : "Maintenance could not be marked resolved.");
    } finally {
      setResolvingMaintenanceId(null);
    }
  }

  async function showMore(kind: "maintenance" | "blog") {
    const items = kind === "maintenance" ? maintenance : posts;
    const offset = kind === "maintenance" ? maintenanceOffset : postsOffset;
    const visible = kind === "maintenance" ? maintenanceVisible : postsVisible;
    if (visible < items.length) {
      kind === "maintenance" ? setMaintenanceVisible(visible + 12) : setPostsVisible(visible + 12);
      return;
    }
    const hasMore = kind === "maintenance" ? maintenanceHasMore : postsHaveMore;
    if (!hasMore) return;
    const generation = paginationGeneration.current[kind];
    setLoadingMore(kind);
    try {
      const response = await fetch(`/api/operator/communications?kind=${kind}&offset=${offset}`);
      const result = await response.json() as { items?: Array<MaintenanceNotice | EditorialPost>; hasMore?: boolean; error?: string };
      if (!response.ok || !result.items) throw new Error(result.error ?? "Older entries could not be loaded.");
      if (generation !== paginationGeneration.current[kind]) return;
      if (kind === "maintenance") {
        setMaintenance(current => [...current, ...(result.items as MaintenanceNotice[])]);
        setMaintenanceOffset(offset + result.items.length);
        setMaintenanceHasMore(Boolean(result.hasMore));
        setMaintenanceVisible(visible + result.items.length);
      } else {
        setPosts(current => [...current, ...(result.items as EditorialPost[])]);
        setPostsOffset(offset + result.items.length);
        setPostsHaveMore(Boolean(result.hasMore));
        setPostsVisible(visible + result.items.length);
      }
    } catch (error) {
      if (generation === paginationGeneration.current[kind]) {
        const message = error instanceof Error ? error.message : "Older entries could not be loaded.";
        kind === "maintenance" ? setMaintenanceMessage(message) : setPostMessage(message);
      }
    } finally {
      if (generation === paginationGeneration.current[kind]) setLoadingMore(null);
    }
  }

  async function refreshList(kind: "maintenance" | "blog") {
    paginationGeneration.current[kind] += 1;
    setLoadingMore(current => current === kind ? null : current);
    try {
      const response = await fetch(`/api/operator/communications?kind=${kind}&offset=0`);
      const result = await response.json() as { items?: Array<MaintenanceNotice | EditorialPost>; hasMore?: boolean };
      if (!response.ok || !result.items) return false;
      if (kind === "maintenance") {
        setMaintenance(result.items as MaintenanceNotice[]);
        setMaintenanceOffset(result.items.length);
        setMaintenanceHasMore(Boolean(result.hasMore));
        setMaintenanceVisible(12);
      } else {
        setPosts(result.items as EditorialPost[]);
        setPostsOffset(result.items.length);
        setPostsHaveMore(Boolean(result.hasMore));
        setPostsVisible(12);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>, kind: "maintenance" | "blog") {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const editing = kind === "maintenance" ? editingMaintenance : editingPost;
    const publishedAt = editingPost?.published_at;
    const payload = kind === "maintenance"
      ? { kind, id: editing?.id, title: raw.title, subtitle: raw.subtitle, message: raw.message, startsAt: toIsoTimestamp(raw.startsAt), endsAt: toIsoTimestamp(raw.endsAt), status: raw.status, affectedServices: String(raw.affectedServices ?? "").split(",").map(value => value.trim()).filter(Boolean) }
      : { kind, id: editing?.id, title: raw.title, subtitle: raw.subtitle, category: raw.category, slug: raw.slug, body: raw.body, status: raw.status, publishedAt };
    setBusy(true);
    kind === "maintenance" ? setMaintenanceMessage("") : setPostMessage("");
    try {
      const response = await fetch("/api/operator/communications", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { item?: MaintenanceNotice | EditorialPost; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error ?? "The update could not be saved.");
      const refreshed = await refreshList(kind);
      if (kind === "maintenance") {
        if (!refreshed) {
          const item = result.item as MaintenanceNotice;
          setMaintenance(current => [item, ...current.filter(existing => existing.id !== item.id)].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)));
          setMaintenanceHasMore(false);
        }
        setEditingMaintenance(null);
        setMaintenanceMessage(refreshed
          ? (editing ? "Maintenance notice updated." : "Maintenance notice published.")
          : "Saved, but the list could not refresh. Reload this page before loading older notices.");
      } else {
        const item = result.item as EditorialPost;
        if (!refreshed) {
          setPosts(current => [item, ...current.filter(existing => existing.id !== item.id)].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
          setPostsHaveMore(false);
        }
        setEditingPost(null);
        setPostMessage(refreshed
          ? (item.status === "published" ? "Field Notes article published." : "Draft saved.")
          : "Saved, but the list could not refresh. Reload this page before loading older articles.");
      }
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The update could not be saved.";
      kind === "maintenance" ? setMaintenanceMessage(message) : setPostMessage(message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="settings-layout" style={{ marginTop: 20 }}>
    <section className="settings-card">
      <div className="eyebrow small-eyebrow">PUBLIC STATUS PAGE</div>
      <h2>{editingMaintenance ? "Edit maintenance notice" : "Schedule maintenance"}</h2>
      <p>Set the start and end time, choose whether the notice is scheduled or ongoing, and publish an update visitors can read on the public maintenance page.</p>
      <form key={editingMaintenance?.id ?? "new-maintenance"} onSubmit={event => submit(event, "maintenance")}>
        <FormField label="Heading"><input name="title" required maxLength={140} defaultValue={editingMaintenance?.title ?? ""} placeholder="Maintenance on fixing known issues" /></FormField>
        <FormField label="Subheading"><input name="subtitle" required maxLength={240} defaultValue={editingMaintenance?.subtitle ?? ""} placeholder="Service will be fully restored soon" /></FormField>
        <FormField label="Main message"><textarea name="message" required rows={5} maxLength={12000} defaultValue={editingMaintenance?.message ?? ""} placeholder="Describe what is being worked on and when visitors should expect the next update." /></FormField>
        <FormField label="Affected services (comma separated)"><input name="affectedServices" defaultValue={editingMaintenance?.affected_services.join(", ") ?? ""} placeholder="Email delivery, Scheduled paper analysis" /></FormField>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <FormField label="Starts"><input name="startsAt" type="datetime-local" required defaultValue={localDateTime(editingMaintenance?.starts_at)} /></FormField>
          <FormField label="Expected end"><input name="endsAt" type="datetime-local" defaultValue={localDateTime(editingMaintenance?.ends_at)} /></FormField>
          <FormField label="State"><select name="status" defaultValue={editingMaintenance?.status ?? "ongoing"}><option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></FormField>
        </div>
        <button className="primary-link" disabled={busy} type="submit">{busy ? "Saving…" : editingMaintenance ? "Save maintenance notice" : "Publish maintenance notice"}</button>
        {editingMaintenance ? <button type="button" onClick={() => setEditingMaintenance(null)}>Cancel edit</button> : null}
        <p role="status" aria-live="polite">{maintenanceMessage}</p>
      </form>
      <h3>Recent notices</h3>
      {maintenance.length ? <ul>{maintenance.slice(0, maintenanceVisible).map(item => <li key={item.id} style={{ margin: "12px 0" }}><strong>{item.title}</strong> · {item.status} · {new Date(item.starts_at).toLocaleString()} {item.status !== "completed" ? <button type="button" disabled={busy || resolvingMaintenanceId !== null} aria-label={`Mark ${item.title} resolved`} onClick={() => void resolveMaintenance(item)}>{resolvingMaintenanceId === item.id ? "Resolving…" : "✓ Resolve"}</button> : <span> · Resolved {item.ends_at ? new Date(item.ends_at).toLocaleString() : "—"}</span>} <button type="button" onClick={() => setEditingMaintenance(item)}>Edit</button></li>)}</ul> : <p>No notices yet.</p>}{maintenance.length > maintenanceVisible || maintenanceHasMore ? <button type="button" disabled={loadingMore !== null || busy || resolvingMaintenanceId !== null} onClick={() => void showMore("maintenance")}>{loadingMore === "maintenance" ? "Loading…" : maintenanceVisible < maintenance.length ? "Show more notices" : "Load older notices"}</button> : null}
    </section>

    <section className="settings-card">
      <div className="eyebrow small-eyebrow">TIDELIGHT FIELD NOTES</div>
      <h2>{editingPost ? "Edit article" : "Write a Field Notes article"}</h2>
      <p>Save a draft or publish an article to the public blog. Published stories appear on the blog homepage and have their own URL.</p>
      <form key={editingPost?.id ?? "new-blog"} onSubmit={event => submit(event, "blog")}>
        <FormField label="Title"><input name="title" required maxLength={180} defaultValue={editingPost?.title ?? ""} /></FormField>
        <FormField label="Subheading"><input name="subtitle" required maxLength={320} defaultValue={editingPost?.subtitle ?? ""} /></FormField>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <FormField label="Category"><input name="category" required maxLength={80} defaultValue={editingPost?.category ?? "PRODUCT NOTES"} /></FormField>
          <FormField label="Article URL slug (optional)"><input name="slug" maxLength={100} defaultValue={editingPost?.slug ?? ""} placeholder="Built from the title if blank" /></FormField>
        </div>
        <FormField label="Main article"><textarea name="body" required rows={12} maxLength={50000} defaultValue={editingPost?.body ?? ""} placeholder="Write the article. Separate paragraphs with a blank line." /></FormField>
        <FormField label="Publishing state"><select name="status" defaultValue={editingPost?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Publish now</option></select></FormField>
        <button className="primary-link" disabled={busy} type="submit">{busy ? "Saving…" : editingPost ? "Save article" : "Save Field Notes article"}</button>
        {editingPost ? <button type="button" onClick={() => setEditingPost(null)}>Cancel edit</button> : null}
        <p role="status" aria-live="polite">{postMessage}</p>
      </form>
      <h3>Recent articles</h3>
      {posts.length ? <ul>{posts.slice(0, postsVisible).map(item => <li key={item.id} style={{ margin: "12px 0" }}><strong>{item.title}</strong> · {item.status} <button type="button" onClick={() => setEditingPost(item)}>Edit</button></li>)}</ul> : <p>No articles yet.</p>}{posts.length > postsVisible || postsHaveMore ? <button type="button" disabled={loadingMore !== null || busy} onClick={() => void showMore("blog")}>{loadingMore === "blog" ? "Loading…" : postsVisible < posts.length ? "Show more articles" : "Load older articles"}</button> : null}
    </section>
  </div>;
}
