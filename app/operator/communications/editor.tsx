"use client";

import { useState, type FormEvent } from "react";
import type { EditorialPost, MaintenanceNotice } from "@/lib/tic/editorial-content";

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 7, margin: "12px 0", fontWeight: 600 }}>{label}{children}</label>;
}

export function CommunicationsEditor({ initialMaintenance, initialPosts }: { initialMaintenance: MaintenanceNotice[]; initialPosts: EditorialPost[] }) {
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [posts, setPosts] = useState(initialPosts);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceNotice | null>(null);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, kind: "maintenance" | "blog") {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const editing = kind === "maintenance" ? editingMaintenance : editingPost;
    const payload = kind === "maintenance"
      ? { kind, id: editing?.id, title: raw.title, subtitle: raw.subtitle, message: raw.message, startsAt: raw.startsAt, endsAt: raw.endsAt || null, status: raw.status, affectedServices: String(raw.affectedServices ?? "").split(",").map(value => value.trim()).filter(Boolean) }
      : { kind, id: editing?.id, title: raw.title, subtitle: raw.subtitle, category: raw.category, slug: raw.slug, body: raw.body, status: raw.status, publishedAt: editing?.published_at };
    setBusy(true);
    kind === "maintenance" ? setMaintenanceMessage("") : setPostMessage("");
    try {
      const response = await fetch("/api/operator/communications", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { item?: MaintenanceNotice | EditorialPost; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error ?? "The update could not be saved.");
      if (kind === "maintenance") {
        const item = result.item as MaintenanceNotice;
        setMaintenance(current => [item, ...current.filter(existing => existing.id !== item.id)].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)));
        setEditingMaintenance(null);
        setMaintenanceMessage(editing ? "Maintenance notice updated." : "Maintenance notice published.");
      } else {
        const item = result.item as EditorialPost;
        setPosts(current => [item, ...current.filter(existing => existing.id !== item.id)].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
        setEditingPost(null);
        setPostMessage(item.status === "published" ? "Field Notes article published." : "Draft saved.");
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
      {maintenance.length ? <ul>{maintenance.slice(0, 12).map(item => <li key={item.id} style={{ margin: "12px 0" }}><strong>{item.title}</strong> · {item.status} · {new Date(item.starts_at).toLocaleString()} <button type="button" onClick={() => setEditingMaintenance(item)}>Edit</button></li>)}</ul> : <p>No notices yet.</p>}
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
      {posts.length ? <ul>{posts.slice(0, 12).map(item => <li key={item.id} style={{ margin: "12px 0" }}><strong>{item.title}</strong> · {item.status} <button type="button" onClick={() => setEditingPost(item)}>Edit</button></li>)}</ul> : <p>No articles yet.</p>}
    </section>
  </div>;
}
