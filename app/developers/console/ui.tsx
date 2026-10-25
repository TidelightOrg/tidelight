"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ApiExplorer from "./explorer";
import Webhooks from "./webhooks";
import { ConsoleSkeleton, ConsoleState } from "./state";
import { canManageOrganization } from "@/lib/tic/organization-rbac";
import { ThemeQuickSwitch } from "@/app/ui/theme-provider";
import { PackageOrbit3D } from "../packages/package-orbit-3d";
import { EcosystemSwitcher } from "../ecosystem-switcher";
import { DeveloperMobileDock } from "../platform-nav";

type Project = { id: string; organization_id: string; name: string; created_at: string };
type Organization = { id: string; name: string; slug: string; role: "owner" | "admin" | "developer" | "reader" };
type OrganizationMember = { user_id: string; email: string; role: Organization["role"]; created_at: string };
type OrganizationAudit = { id: number; action: string; previous_role: string | null; new_role: string | null; created_at: string };
type Key = { id: string; project_id: string; owner_id: string; name: string; environment: string; key_prefix: string; scopes: string[]; expires_at: string | null; revoked_at: string | null; last_used_at: string | null; created_at: string };
type Call = { id: string; project_id: string; key_id: string | null; endpoint: string; status_code: number | null; duration_ms: number | null; created_at: string };
type UsageDay = { usage_day: string; request_count: number; success_count: number; client_error_count: number; server_error_count: number; pending_count: number; average_duration_ms: number | null };
type ResearchJob = { id: string; project_id: string; ticker: string; status: string; attempt_count: number; max_attempts: number; result: unknown; error_code: string | null; created_at: string; completed_at: string | null; cancel_requested_at: string | null };
type KeyAudit = { id: number; project_id: string; actor_email: string; action: "created" | "rotated" | "revoked"; key_name: string; created_at: string };
type OAuthConnection = { id: string; client_name: string; project_name: string; scopes: string[]; created_at: string; refresh_token_expires_at: string | null; active: boolean; revoked_at: string | null };
type View = "overview" | "projects" | "keys" | "explorer" | "usage" | "research" | "organizations" | "webhooks" | "mcp" | "security";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "The request failed.");
  return body;
}
async function mutate(url: string, method: "POST" | "PATCH" | "DELETE", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "The request failed.");
  return result;
}

export default function DeveloperConsole({ userId }: { userId: string }) {
  const [view, setView] = useState<View>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [dailyUsage, setDailyUsage] = useState<UsageDay[]>([]);
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [organizationAudit, setOrganizationAudit] = useState<OrganizationAudit[]>([]);
  const [keyAudit, setKeyAudit] = useState<KeyAudit[]>([]);
  const [oauthConnections, setOauthConnections] = useState<OAuthConnection[]>([]);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [keyAuditLoading, setKeyAuditLoading] = useState(false);
  const [keyAuditFilter, setKeyAuditFilter] = useState<"all" | KeyAudit["action"]>("all");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "developer" | "reader">("developer");
  const [organizationName, setOrganizationName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState("");
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["market:read"]);
  const [projectId, setProjectId] = useState("");
  const [environment, setEnvironment] = useState<"test" | "production">("test");
  const [days, setDays] = useState(90);
  const [usageRangeDays, setUsageRangeDays] = useState<7 | 30 | 90>(30);
  const [usageProjectFilter, setUsageProjectFilter] = useState("all");
  const [usageStatusFilter, setUsageStatusFilter] = useState("all");
  const [usageEndpointFilter, setUsageEndpointFilter] = useState("all");
  const [usageKeyFilter, setUsageKeyFilter] = useState("all");
  const [usageTimeFilter, setUsageTimeFilter] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [secret, setSecret] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const reload = useCallback(async () => {
    try {
      const [p, k, u, j, o] = await Promise.all([readJson<{ projects: Project[] }>("/api/developers/projects"), readJson<{ keys: Key[] }>("/api/developers/keys"), readJson<{ requests: Call[]; daily: UsageDay[] }>(`/api/developers/usage?days=${usageRangeDays}`), readJson<{ jobs: ResearchJob[] }>("/api/developers/jobs"), readJson<{ organizations: Organization[] }>("/api/developers/organizations")]);
      setProjects(p.projects); setKeys(k.keys); setCalls(u.requests); setDailyUsage(u.daily); setJobs(j.jobs); setOrganizations(o.organizations); setError(""); setLoadFailed(false); setCurrentTime(Date.now());
      setOrganizationId(current => o.organizations.some(org => org.id === current) ? current : o.organizations[0]?.id ?? "");
      setProjectId(current => {
        const canUse = (project: Project) => o.organizations.some(org => org.id === project.organization_id && org.role !== "reader");
        return p.projects.some(project => project.id === current && canUse(project)) ? current : p.projects.find(canUse)?.id ?? "";
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the console."); setLoadFailed(true); }
    finally { setLoading(false); }
  }, [usageRangeDays]);
  const reloadKeyAudit = useCallback(async () => {
    setKeyAuditLoading(true); setError("");
    try { const action = keyAuditFilter === "all" ? "" : `?action=${keyAuditFilter}`; const result = await readJson<{ events: KeyAudit[] }>(`/api/developers/key-audit${action}`); setKeyAudit(result.events); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the security log."); }
    finally { setKeyAuditLoading(false); }
  }, [keyAuditFilter]);
  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [reload]);
  useEffect(() => {
    if (view !== "organizations" || !organizationId) return;
    let alive = true;
    void readJson<{ members: OrganizationMember[]; audit: OrganizationAudit[] }>(`/api/developers/organizations/${organizationId}/members`)
      .then(result => { if (alive) { setMembers(result.members); setOrganizationAudit(result.audit); } })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : "Could not load organization members."); });
    return () => { alive = false; };
  }, [view, organizationId]);
  const reloadOAuthConnections = useCallback(async () => {
    setOauthLoading(true);
    try { const result = await readJson<{ connections: OAuthConnection[] }>("/api/developers/oauth/connections"); setOauthConnections(result.connections); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load MCP connections."); }
    finally { setOauthLoading(false); }
  }, []);
  useEffect(() => {
    if (view !== "mcp") return;
    const timer = window.setTimeout(() => void reloadOAuthConnections(), 0);
    return () => window.clearTimeout(timer);
  }, [view, reloadOAuthConnections]);
  async function revokeOAuthConnection(id: string) {
    if (!window.confirm("Revoke this MCP connection now? The client will need to authorize again.")) return;
    setBusy(true); setError("");
    try { await mutate("/api/developers/oauth/connections", "DELETE", { id }); await reloadOAuthConnections(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke this connection."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (view !== "security") return;
    const timer = window.setTimeout(() => void reloadKeyAudit(), 0);
    return () => window.clearTimeout(timer);
  }, [view, reloadKeyAudit]);
  function selectOrganization(id: string) {
    setMembers([]); setOrganizationAudit([]); setOrganizationId(id);
  }
  useEffect(() => {
    if (!window.matchMedia("(max-width: 620px)").matches) return;
    const nav = document.querySelector<HTMLElement>(".tic-console-nav");
    const selected = nav?.querySelector<HTMLButtonElement>("button.selected");
    if (!nav || !selected) return;
    const navRect = nav.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    if (selectedRect.left >= navRect.left && selectedRect.right <= navRect.right) return;
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const centeredLeft = nav.scrollLeft + selectedRect.left - navRect.left - (nav.clientWidth - selected.clientWidth) / 2;
    nav.scrollTo({ left: Math.max(0, centeredLeft), behavior });
  }, [view]);
  async function createProject(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await mutate("/api/developers/projects", "POST", { name: projectName, organizationId }); setProjectName(""); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create project."); }
    finally { setBusy(false); }
  }
  async function createKey(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await mutate("/api/developers/keys", "POST", { projectId, name: keyName, environment, expiresInDays: days, scopes: keyScopes }); setSecret(result.secret); setKeyName(""); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create key."); }
    finally { setBusy(false); }
  }
  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this credential? Requests using it will stop immediately.")) return;
    setBusy(true); setError("");
    try { await mutate("/api/developers/keys", "DELETE", { id }); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke key."); }
    finally { setBusy(false); }
  }
  async function rotateKey(id: string) {
    if (!window.confirm("Rotate this credential? The current secret will stop working immediately, and you will need to update your application with the new secret.")) return;
    setBusy(true); setError(""); setSecret("");
    try { const result = await mutate(`/api/developers/keys/${id}/rotate`, "POST", {}); setSecret(result.secret); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not rotate key."); }
    finally { setBusy(false); }
  }
  async function cancelJob(id: string) {
    if (!window.confirm("Cancel this research job? A running provider request may finish, but its result will be discarded.")) return;
    setBusy(true); setError("");
    try { await mutate("/api/developers/jobs", "DELETE", { id }); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not cancel the research job."); }
    finally { setBusy(false); }
  }
  async function createOrganization(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await mutate("/api/developers/organizations", "POST", { name: organizationName }); setOrganizationName(""); selectOrganization(result.organization.id); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create organization."); }
    finally { setBusy(false); }
  }
  async function addMember(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await mutate(`/api/developers/organizations/${organizationId}/members`, "POST", { email: memberEmail, role: memberRole }); setMemberEmail(""); const result = await readJson<{ members: OrganizationMember[]; audit: OrganizationAudit[] }>(`/api/developers/organizations/${organizationId}/members`); setMembers(result.members); setOrganizationAudit(result.audit); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add organization member."); }
    finally { setBusy(false); }
  }
  async function refreshMembers() {
    const result = await readJson<{ members: OrganizationMember[]; audit: OrganizationAudit[] }>(`/api/developers/organizations/${organizationId}/members`);
    setMembers(result.members); setOrganizationAudit(result.audit);
  }
  async function updateMember(memberUserId: string, role: OrganizationMember["role"]) {
    setBusy(true); setError("");
    try { await mutate(`/api/developers/organizations/${organizationId}/members`, "PATCH", { userId: memberUserId, role }); if (memberUserId === userId) await reload(); await refreshMembers(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update organization member."); }
    finally { setBusy(false); }
  }
  async function removeMember(memberUserId: string) {
    if (!window.confirm("Remove this member from the organization? Credentials they created for its projects will be revoked immediately.")) return;
    setBusy(true); setError("");
    try { await mutate(`/api/developers/organizations/${organizationId}/members`, "DELETE", { userId: memberUserId }); if (memberUserId === userId) { setMembers([]); setOrganizationAudit([]); await reload(); } else await refreshMembers(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove organization member."); }
    finally { setBusy(false); }
  }
  const activeKeys = keys.filter(key => !key.revoked_at && (!key.expires_at || Date.parse(key.expires_at) > currentTime));
  const usageTotals = dailyUsage.reduce((totals, day) => ({
    requests: totals.requests + Number(day.request_count || 0),
    successes: totals.successes + Number(day.success_count || 0),
    clientErrors: totals.clientErrors + Number(day.client_error_count || 0),
    serverErrors: totals.serverErrors + Number(day.server_error_count || 0),
  }), { requests: 0, successes: 0, clientErrors: 0, serverErrors: 0 });
  const usageMax = Math.max(1, ...dailyUsage.map(day => Number(day.request_count || 0)));
  const recentUsageCalls = calls.filter(call =>
    (usageProjectFilter === "all" || call.project_id === usageProjectFilter) &&
    (usageStatusFilter === "all" || (usageStatusFilter === "success" ? call.status_code !== null && call.status_code < 400 : usageStatusFilter === "pending" ? call.status_code === null : usageStatusFilter === "client-error" ? call.status_code !== null && call.status_code >= 400 && call.status_code < 500 : call.status_code !== null && call.status_code >= 500)) &&
    (usageEndpointFilter === "all" || call.endpoint === usageEndpointFilter) &&
    (usageKeyFilter === "all" || call.key_id === usageKeyFilter) &&
    (usageTimeFilter === "all" || Date.parse(call.created_at) >= Date.now() - ({ "24h": 1, "7d": 7, "30d": 30 }[usageTimeFilter] * 24 * 60 * 60 * 1000))
  );
  const usageEndpoints = [...new Set(calls.map(call => call.endpoint))].sort();
  const usageKeys = keys.filter(key => calls.some(call => call.key_id === key.id));
  const writableProjects = projects.filter(project => organizations.some(org => org.id === project.organization_id && org.role !== "reader"));
  const writableProjectIds = new Set(writableProjects.map(project => project.id));
  const activeOrganization = organizations.find(org => org.id === organizationId);
  const canManageTeam = activeOrganization ? canManageOrganization(activeOrganization.role) : false;
  const isLastOwner = (member: OrganizationMember) => member.role === "owner" && members.filter(candidate => candidate.role === "owner").length === 1;
  return <main className="tic tic-console"><header className="tic-console-header"><Link href="https://tidelight.app/developers" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={32} height={32} priority /><strong>Tidelight</strong><span>Intelligence Cloud</span></Link><div className="tic-console-header-actions"><EcosystemSwitcher current="intelligence"/><ThemeQuickSwitch/><Link href="https://package.tidelight.app">Packages →</Link><Link href="https://dev.tidelight.app">Documentation →</Link><Link href="https://tidelight.app/developers/support">Support →</Link></div></header><div className="tic-console-grid"><aside className="tic-console-nav" aria-label="Developer workspace navigation"><p className="tic-eyebrow">WORKSPACE</p><p className="tic-console-nav-group">BUILD</p>{(["overview", "organizations", "projects", "keys", "explorer", "research", "webhooks"] as View[]).map(item => <button type="button" className={view === item ? "selected" : ""} aria-current={view === item ? "page" : undefined} aria-pressed={view === item} key={item} onClick={() => { setSecret(""); setView(item); if (item === "usage" || item === "overview" || item === "research") void reload(); }}>{item === "keys" ? "API keys" : item === "explorer" ? "API explorer" : item === "usage" ? "Request usage" : item === "research" ? "Research jobs" : item === "organizations" ? "Organizations & team" : item === "webhooks" ? "Webhooks" : item[0].toUpperCase() + item.slice(1)}</button>)}<p className="tic-console-nav-group">OBSERVE</p>{(["mcp", "usage", "security"] as View[]).map(item => <button type="button" className={view === item ? "selected" : ""} aria-current={view === item ? "page" : undefined} aria-pressed={view === item} key={item} onClick={() => { setSecret(""); setView(item); if (item === "usage" || item === "overview" || item === "research") void reload(); }}>{item === "usage" ? "Request usage" : item === "mcp" ? "MCP connections" : "Security log"}</button>)}<div className="tic-nav-foot">Scoped API access<br/><span>Research jobs use existing market and evidence sources.</span></div></aside><div className="tic-console-main">{error && !loadFailed && <div className="tic-alert" role="alert">{error} <button onClick={() => void reload()}>Retry</button></div>}{loading ? <ConsoleSkeleton /> : loadFailed ? <ConsoleState kind="error" eyebrow="WORKSPACE / CONNECTION" title="Workspace data couldn’t load" description={error || "Tidelight could not retrieve your developer workspace. Your projects and credentials remain unchanged."} action={{ label: "Try again", onClick: () => { setLoading(true); void reload(); } }} /> : <>{view === "overview" && <>
    <section className="tic-console-welcome">
      <div className="tic-console-welcome-copy"><p className="tic-eyebrow">DEVELOPER WORKSPACE / LIVE</p><h1>Build on clear signals.</h1><p className="tic-lead">A secure workspace for projects, scoped credentials, and verified market research.</p><div className="tic-console-actions"><button className="tic-button tic-primary" onClick={() => setView("projects")}>Create a project <span aria-hidden="true">↗</span></button><button className="tic-button" onClick={() => setView("explorer")}>Open API explorer <span aria-hidden="true">→</span></button></div><div className="tic-console-health"><span className="tic-live-dot"/> Workspace connected <i/> Private credentials <i/> Scoped access</div></div>
      <div className="tic-console-visual"><PackageOrbit3D motionTargetSelector=".tic-console-visual" staticFallback/><div className="tic-orbit-caption"><span>MARKET SIGNAL NETWORK</span><strong>Evidence → insight → action</strong></div></div>
    </section>
    <div className="tic-stat-grid tic-console-stats"><div><span>PROJECTS</span><strong>{projects.length}</strong><small>Applications in this workspace</small></div><div><span>ACTIVE KEYS</span><strong>{activeKeys.length}</strong><small>Scoped, private credentials</small></div><div><span>REQUESTS · {usageRangeDays} DAYS</span><strong>{usageTotals.requests.toLocaleString()}</strong><small>{calls.length} recent records available</small></div><div><span>RECENT JOBS · LATEST 100</span><strong>{jobs.length}</strong><small>{jobs.filter(job => job.status === "complete").length} completed in this list</small></div></div>
    <div className="tic-console-overview-grid"><section className="tic-panel tic-console-quick-panel"><div className="tic-console-section-head"><div><p className="tic-eyebrow">YOUR WORKFLOW</p><h2>Quick actions</h2></div><span>01 — 04</span></div><div className="tic-console-quick-actions"><button onClick={() => setView("projects")}><span>01</span><strong>Set up a project</strong><small>Separate access and activity by application</small><b aria-hidden="true">↗</b></button><button onClick={() => setView("keys")}><span>02</span><strong>Issue a scoped key</strong><small>Grant only the permissions your app needs</small><b aria-hidden="true">↗</b></button><button onClick={() => setView("explorer")}><span>03</span><strong>Test an endpoint</strong><small>Run an authorized request in the explorer</small><b aria-hidden="true">↗</b></button><Link href="/developers/packages"><span>04</span><strong>Install a package</strong><small>SDKs, React, CLI, Python, and MCP</small><b aria-hidden="true">↗</b></Link><a href="https://dev.tidelight.app/#connect-with-the-mcp-server" target="_blank" rel="noreferrer"><span>05</span><strong>Connect an MCP client</strong><small>Authorize the remote Streamable HTTP server</small><b aria-hidden="true">↗</b></a></div></section>
      <section className="tic-panel tic-console-activity"><div className="tic-console-section-head"><div><p className="tic-eyebrow">OBSERVABILITY</p><h2>Recent requests</h2></div><button onClick={() => setView("usage")}>View usage →</button></div>{calls.length ? <div className="tic-console-request-list">{calls.slice(0, 5).map(call => <div className="tic-console-request" key={call.id}><span className={`tic-request-status ${call.status_code && call.status_code < 400 ? "is-ok" : ""}`}>{call.status_code ?? "…"}</span><div><strong>{call.endpoint}</strong><small>{projects.find(project => project.id === call.project_id)?.name ?? "Project"} · {new Date(call.created_at).toLocaleString()}</small></div><code>{call.duration_ms == null ? "—" : `${call.duration_ms} ms`}</code></div>)}</div> : <ConsoleState eyebrow="OBSERVABILITY / REQUESTS" title="Ready for your first request" description="Requests made with a scoped project key appear here with status and latency." action={{ label: "Open API explorer", onClick: () => setView("explorer") }} />}</section></div>
  </>}{view === "organizations" && <><p className="tic-eyebrow">WORKSPACE / ORGANIZATIONS</p><h1>Organizations &amp; team</h1><p className="tic-lead">Group developer projects under shared roles. Add existing Tidelight accounts; invitations by email are not enabled until delivery is configured.</p><form className="tic-inline-form" onSubmit={createOrganization}><label>Organization name<input value={organizationName} onChange={event => setOrganizationName(event.target.value)} minLength={2} maxLength={80} required placeholder="Research team" /></label><button className="tic-button tic-primary" disabled={busy}>Create organization</button></form><section className="tic-panel"><h2>Organization</h2><label>Select workspace<select value={organizationId} onChange={event => selectOrganization(event.target.value)}>{organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.role}</option>)}</select></label>{organizations.find(org => org.id === organizationId) && <p><code>{organizations.find(org => org.id === organizationId)?.slug}</code> · {organizations.find(org => org.id === organizationId)?.role}</p>}</section><section className="tic-panel"><h2>Members</h2>{canManageTeam && <form className="tic-inline-form" onSubmit={addMember}><label>Registered account email<input type="email" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} required maxLength={254} placeholder="colleague@example.com" /></label><label>Role<select value={memberRole} onChange={event => setMemberRole(event.target.value as "admin" | "developer" | "reader")}><option value="developer">Developer</option><option value="reader">Reader</option>{organizations.find(org => org.id === organizationId)?.role === "owner" && <option value="admin">Admin</option>}</select></label><button className="tic-button tic-primary" disabled={busy}>Add member</button></form>}{members.length ? <ul className="tic-list tic-member-list">{members.map(member => <li className="tic-member-row" key={member.user_id}><div className="tic-member-identity"><strong>{member.email}</strong></div><span>{member.role}</span>{canManageTeam && <><select aria-label={`Role for ${member.email}`} value={member.role} disabled={busy || isLastOwner(member) || (activeOrganization?.role === "admin" && ["owner","admin"].includes(member.role)) || (member.role === "owner" && activeOrganization?.role !== "owner")} onChange={event => void updateMember(member.user_id,event.target.value as OrganizationMember["role"])}><option value="owner">Owner</option><option value="admin">Admin</option><option value="developer">Developer</option><option value="reader">Reader</option></select><button disabled={busy || isLastOwner(member) || (activeOrganization?.role === "admin" && ["owner","admin"].includes(member.role))} title={isLastOwner(member) ? "An organization must keep one owner." : undefined} onClick={() => void removeMember(member.user_id)}>Remove</button></>}</li>)}</ul> : <p>No members found.</p>}</section>{organizationAudit.length > 0 && <section className="tic-panel"><h2>Recent member changes</h2><ul className="tic-list">{organizationAudit.map(event => <li key={event.id}><strong>{event.action.replaceAll("_"," ")}</strong><small>{event.previous_role ? `${event.previous_role} → ${event.new_role ?? "removed"}` : event.new_role}</small><time>{new Date(event.created_at).toLocaleString()}</time></li>)}</ul></section>}</>}{view === "projects" && <><p className="tic-eyebrow">ACCESS / PROJECTS</p><h1>Projects</h1><p className="tic-lead">Each project groups the credentials and request history for one application.</p><form className="tic-inline-form" onSubmit={createProject}><label>Project name<input value={projectName} onChange={event => setProjectName(event.target.value)} minLength={2} maxLength={80} required placeholder="My research application" /></label><label>Organization<select value={organizationId} onChange={event => selectOrganization(event.target.value)} required>{organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.role}</option>)}</select></label><button className="tic-button tic-primary" disabled={busy || organizations.find(org => org.id === organizationId)?.role === "reader"}>Create project</button></form><div className="tic-panel"><h2>Workspace projects</h2>{projects.length ? <ul className="tic-list">{projects.map(project => <li key={project.id}><strong>{project.name}</strong><small>{organizations.find(org => org.id === project.organization_id)?.name ?? "Organization"}</small><small>{project.id}</small><time>{new Date(project.created_at).toLocaleDateString()}</time></li>)}</ul> : <ConsoleState eyebrow="ACCESS / PROJECTS" title="Start with a project" description="Projects keep each application’s credentials and request history separate." action={{ label: "Name your first project", onClick: () => document.querySelector<HTMLInputElement>(".tic-inline-form input")?.focus() }} />}</div></>}{view === "keys" && <><p className="tic-eyebrow">ACCESS / CREDENTIALS</p><h1>API keys</h1><p className="tic-lead">Secrets appear only when created or rotated. Store them in your server’s secret manager.</p>{secret && <div className="tic-secret" role="status"><strong>Copy this key now. It will not be shown again.</strong><code>{secret}</code><button className="tic-button" onClick={() => void navigator.clipboard.writeText(secret)}>Copy secret</button><button className="tic-button" onClick={() => setSecret("")}>Done</button></div>}<form className="tic-key-form" onSubmit={createKey}><label>Project<select value={projectId} onChange={event => setProjectId(event.target.value)} required>{writableProjects.map(project => <option key={project.id} value={project.id}>{project.name} · {organizations.find(org => org.id === project.organization_id)?.name}</option>)}</select></label><label>Key name<input value={keyName} onChange={event => setKeyName(event.target.value)} minLength={2} maxLength={80} required placeholder="Server integration" /></label><label>Environment<select value={environment} onChange={event => setEnvironment(event.target.value as "test" | "production")}><option value="test">Test</option><option value="production">Production</option></select></label><label>Expires in days<input type="number" min="1" max="365" value={days} onChange={event => setDays(Number(event.target.value))} required /></label><fieldset className="tic-scope-picker"><legend>Permissions</legend><label><input type="checkbox" checked={keyScopes.includes("market:read")} onChange={() => setKeyScopes(current => current.includes("market:read") ? current.filter(scope => scope !== "market:read") : [...current, "market:read"])} /> <code>market:read</code><small>Read supported market instruments.</small></label><label><input type="checkbox" checked={keyScopes.includes("research:run")} onChange={() => setKeyScopes(current => current.includes("research:run") ? current.filter(scope => scope !== "research:run") : [...current, "research:run"])} /> <code>research:run</code><small>Start and inspect company research snapshots.</small></label><label><input type="checkbox" checked={keyScopes.includes("alerts:manage")} onChange={() => setKeyScopes(current => current.includes("alerts:manage") ? current.filter(scope => scope !== "alerts:manage") : [...current, "alerts:manage"])} /> <code>alerts:manage</code><small>Manage project webhook subscriptions.</small></label></fieldset><p>Limits: 30 API requests per minute · 10,000 per month. Research jobs: 10 per project per hour.</p><button className="tic-button tic-primary" disabled={busy || !writableProjects.length || !keyScopes.length}>Create key</button>{!writableProjects.length && <p>A developer, admin, or owner role is required to issue credentials.</p>}</form><div className="tic-panel"><h2>Issued credentials</h2>{keys.length ? <div className="tic-table-wrap"><table><thead><tr><th>Name</th><th>Prefix</th><th>Environment</th><th>Last used</th><th>Status</th><th></th></tr></thead><tbody>{keys.map(key => <tr key={key.id}><td>{key.name}</td><td><code>{key.key_prefix}…</code></td><td>{key.environment}</td><td>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}</td><td>{key.revoked_at ? "Revoked" : key.expires_at && Date.parse(key.expires_at) <= currentTime ? "Expired" : "Active"}</td><td>{!key.revoked_at && organizations.some(org => org.id === projects.find(project => project.id === key.project_id)?.organization_id && (org.role !== "reader" || key.owner_id === userId)) && <>{(!key.expires_at || Date.parse(key.expires_at) > currentTime) && <button disabled={busy} onClick={() => void rotateKey(key.id)}>Rotate</button>} <button disabled={busy} onClick={() => void revokeKey(key.id)}>Revoke</button></>}</td></tr>)}</tbody></table></div> : <ConsoleState eyebrow="ACCESS / CREDENTIALS" title="No API keys yet" description="Create a scoped key for a project to authorize API and MCP requests. The secret is shown only once." action={{ label: "Choose a project", onClick: () => document.querySelector<HTMLSelectElement>(".tic-key-form select")?.focus() }} />}</div></>}{view === "explorer" && <ApiExplorer projects={writableProjects} keys={keys.filter(key => writableProjectIds.has(key.project_id))} currentTime={currentTime} onViewResearch={() => { setView("research"); void reload(); }} />}{view === "research" && <><p className="tic-eyebrow">RESEARCH / JOBS</p><h1>Research jobs</h1><p className="tic-lead">Track asynchronous company snapshots created with a research scoped API key.</p><div className="tic-panel"><div className="tic-job-toolbar"><h2>Recent jobs</h2><button className="tic-button" onClick={() => void reload()}>Refresh</button></div>{jobs.length ? <div className="tic-table-wrap"><table><thead><tr><th>Ticker</th><th>Status</th><th>Attempts</th><th>Created</th><th>Finished</th><th>Result</th><th></th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><strong>{job.ticker}</strong></td><td><span className={`tic-job-status is-${job.status}`}>{job.cancel_requested_at && job.status === "running" ? "cancelling" : job.status.replace("_", " ")}</span>{job.error_code && <small>{job.error_code}</small>}</td><td>{job.attempt_count}/{job.max_attempts}</td><td>{new Date(job.created_at).toLocaleString()}</td><td>{job.completed_at ? new Date(job.completed_at).toLocaleString() : "—"}</td><td>{job.status === "complete" && job.result !== null && typeof job.result === "object" && <details><summary>Snapshot JSON</summary><pre>{JSON.stringify(job.result, null, 2)}</pre></details>}</td><td>{["queued", "retry_wait", "running"].includes(job.status) && organizations.some(org => org.id === projects.find(project => project.id === job.project_id)?.organization_id && org.role !== "reader") && <button disabled={busy || !!job.cancel_requested_at} onClick={() => void cancelJob(job.id)}>Cancel</button>}</td></tr>)}</tbody></table></div> : <ConsoleState eyebrow="RESEARCH / JOBS" title="No research jobs yet" description="Jobs created with a research:run key will appear here with their current status and result." action={{ label: "Open API explorer", onClick: () => setView("explorer") }} />}</div></>}{view === "webhooks" && <Webhooks projects={writableProjects} />}{view === "mcp" && <><p className="tic-eyebrow">ACCESS / MCP</p><h1>MCP connections</h1><p className="tic-lead">OAuth grants approved for your account. Access tokens last 15 minutes and refresh tokens rotate after use.</p><div className="tic-panel"><div className="tic-job-toolbar"><h2>Authorized clients</h2><button className="tic-button" disabled={oauthLoading} onClick={() => void reloadOAuthConnections()}>Refresh</button></div>{oauthLoading ? <p role="status">Loading connections…</p> : oauthConnections.length ? <div className="tic-table-wrap"><table><thead><tr><th>Client</th><th>Project</th><th>Scopes</th><th>Authorized</th><th>Status</th><th></th></tr></thead><tbody>{oauthConnections.map(connection => <tr key={connection.id}><td>{connection.client_name}</td><td>{connection.project_name}</td><td>{connection.scopes.join(", ")}</td><td>{new Date(connection.created_at).toLocaleString()}</td><td><span className={`tic-job-status is-${connection.active ? "complete" : "revoked"}`}>{connection.active ? "active" : connection.revoked_at ? "revoked" : "expired or key unavailable"}</span></td><td>{connection.active && <button disabled={busy} onClick={() => void revokeOAuthConnection(connection.id)}>Revoke</button>}</td></tr>)}</tbody></table></div> : <ConsoleState eyebrow="ACCESS / MCP" title="No connected clients" description="Approved MCP clients will appear here. Connect from a compatible client using the Tidelight MCP server URL." action={{ label: "View MCP setup", href: "https://dev.tidelight.app/#connect-with-the-mcp-server" }} />}</div></>}{view === "usage" && <><p className="tic-eyebrow">OBSERVABILITY / REQUESTS</p><h1>Request usage</h1><p className="tic-lead">Exact authorized request totals across the projects you can access for the selected period. Monetary cost is not available yet.</p><div className="tic-stat-grid tic-usage-summary"><div><span>API REQUESTS · {usageRangeDays} DAYS</span><strong>{usageTotals.requests.toLocaleString()}</strong></div><div><span>SUCCESSFUL</span><strong>{usageTotals.successes.toLocaleString()}</strong></div><div><span>CLIENT ERRORS</span><strong>{usageTotals.clientErrors.toLocaleString()}</strong></div><div><span>SERVER ERRORS</span><strong>{usageTotals.serverErrors.toLocaleString()}</strong></div></div><section className="tic-panel"><div className="tic-usage-heading"><div><h2>Daily request volume</h2><p>UTC · Includes successful and failed authorized requests</p><div className="tic-usage-range" role="group" aria-label="Usage date range"><button type="button" aria-pressed={usageRangeDays === 7} className={usageRangeDays === 7 ? "selected" : ""} onClick={() => setUsageRangeDays(7)}>7 days</button><button type="button" aria-pressed={usageRangeDays === 30} className={usageRangeDays === 30 ? "selected" : ""} onClick={() => setUsageRangeDays(30)}>30 days</button><button type="button" aria-pressed={usageRangeDays === 90} className={usageRangeDays === 90 ? "selected" : ""} onClick={() => setUsageRangeDays(90)}>90 days</button></div></div><strong>{dailyUsage.length ? `${new Date(`${dailyUsage[0].usage_day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} – ${new Date(`${dailyUsage[dailyUsage.length - 1].usage_day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}` : `Past ${usageRangeDays} days`}</strong><button type="button" className="tic-button" onClick={() => void reload()}>Refresh</button></div>{dailyUsage.length ? <><div className="tic-usage-bars" style={{ gridTemplateColumns: `repeat(${dailyUsage.length}, minmax(2px, 1fr))` }} role="img" aria-label={`Daily authorized API requests for the past ${usageRangeDays} days; ${usageTotals.requests.toLocaleString()} total requests`}>
{dailyUsage.map(day => { const count = Number(day.request_count || 0); const label = new Date(`${day.usage_day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }); return <span key={day.usage_day} title={`${label}: ${count.toLocaleString()} requests${day.average_duration_ms == null ? "" : ` · ${Number(day.average_duration_ms).toLocaleString()} ms average`}` } style={{ height: `${count === 0 ? 3 : Math.max(8, count / usageMax * 100)}%` }} />; })}
</div><div className="tic-usage-axis"><span>{new Date(`${dailyUsage[0].usage_day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span><span>{new Date(`${dailyUsage[Math.floor((dailyUsage.length - 1) / 2)].usage_day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span><span>{new Date(`${dailyUsage[dailyUsage.length - 1].usage_day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span></div><details className="tic-usage-data"><summary>View daily breakdown</summary><div className="tic-table-wrap"><table><thead><tr><th>UTC day</th><th>Requests</th><th>Success</th><th>Client errors</th><th>Server errors</th><th>Average latency</th></tr></thead><tbody>{dailyUsage.map(day => <tr key={day.usage_day}><td>{day.usage_day}</td><td>{Number(day.request_count).toLocaleString()}</td><td>{Number(day.success_count).toLocaleString()}</td><td>{Number(day.client_error_count).toLocaleString()}</td><td>{Number(day.server_error_count).toLocaleString()}</td><td>{day.average_duration_ms == null ? "—" : `${Number(day.average_duration_ms).toLocaleString()} ms`}</td></tr>)}</tbody></table></div></details></> : <ConsoleState eyebrow={`OBSERVABILITY / ${usageRangeDays} DAYS`} title={projects.length ? "No request activity yet" : "Create a project to begin"} description={projects.length ? "Usage appears here after an authorized API request. Your totals will be based on recorded requests." : "Create a project and scoped key to start tracking authorized API usage."} action={!projects.length ? { label: "Open projects", onClick: () => setView("projects") } : undefined} />}</section><div className="tic-panel"><div className="tic-usage-log-heading"><div><h2>Recent authorized requests</h2><p>The latest 100 records. Daily totals above cover the full selected period.</p></div><span>{recentUsageCalls.length} shown</span></div>{calls.length ? <><div className="tic-usage-log-filters" aria-label="Filter recent requests"><label>Project<select aria-label="Filter requests by project" value={usageProjectFilter} onChange={event => setUsageProjectFilter(event.target.value)}><option value="all">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>API key<select aria-label="Filter requests by API key" value={usageKeyFilter} onChange={event => setUsageKeyFilter(event.target.value)}><option value="all">All API keys</option>{usageKeys.map(key => <option key={key.id} value={key.id}>{key.name} · {key.key_prefix}</option>)}</select></label><label>Endpoint<select aria-label="Filter requests by endpoint" value={usageEndpointFilter} onChange={event => setUsageEndpointFilter(event.target.value)}><option value="all">All endpoints</option>{usageEndpoints.map(endpoint => <option key={endpoint} value={endpoint}>{endpoint}</option>)}</select></label><label>Status<select aria-label="Filter requests by status" value={usageStatusFilter} onChange={event => setUsageStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="success">Successful</option><option value="client-error">Client errors</option><option value="server-error">Server errors</option><option value="pending">Pending</option></select></label><label>Time<select aria-label="Filter requests by time" value={usageTimeFilter} onChange={event => setUsageTimeFilter(event.target.value as typeof usageTimeFilter)}><option value="all">All recent</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label><button type="button" className="tic-button" onClick={() => { setUsageProjectFilter("all"); setUsageKeyFilter("all"); setUsageEndpointFilter("all"); setUsageStatusFilter("all"); setUsageTimeFilter("all"); }}>Clear filters</button></div>{recentUsageCalls.length ? <div className="tic-table-wrap"><table><thead><tr><th>Time</th><th>Endpoint</th><th>Project</th><th>Status</th><th>Duration</th></tr></thead><tbody>{recentUsageCalls.map(call => <tr key={call.id}><td>{new Date(call.created_at).toLocaleString()}</td><td><code>{call.endpoint}</code></td><td>{projects.find(project => project.id === call.project_id)?.name ?? call.project_id}</td><td>{call.status_code ?? "Pending"}</td><td>{call.duration_ms == null ? "—" : `${call.duration_ms} ms`}</td></tr>)}</tbody></table></div> : <p className="tic-usage-log-empty">No recent requests match these filters. Clear filters or select another value.</p>}</> : <ConsoleState eyebrow="OBSERVABILITY / REQUESTS" title="No requests recorded" description="Authorized API requests will appear here after a project key makes its first call." action={{ label: "Open API explorer", onClick: () => setView("explorer") }} />}</div></>}{view === "security" && <><p className="tic-eyebrow">SECURITY / CREDENTIAL HISTORY</p><h1>Security log</h1><p className="tic-lead">Key creation, rotation, and revocation across projects you can access. The latest 100 events are shown.</p><div className="tic-panel"><div className="tic-job-toolbar tic-audit-toolbar"><h2>Credential events</h2><label>Event<select aria-label="Filter security log by event" value={keyAuditFilter} onChange={event => setKeyAuditFilter(event.target.value as typeof keyAuditFilter)}><option value="all">All events</option><option value="created">Created</option><option value="rotated">Rotated</option><option value="revoked">Revoked</option></select></label><button className="tic-button" disabled={keyAuditLoading} onClick={() => void reloadKeyAudit()}>Refresh</button></div>{keyAuditLoading ? <p role="status">Loading recent credential events…</p> : keyAudit.length ? <div className="tic-table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Credential</th><th>Project</th><th>Actor</th></tr></thead><tbody>{keyAudit.map(event => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString()}</td><td><span className={`tic-job-status is-${event.action}`}>{event.action}</span></td><td>{event.key_name}</td><td>{projects.find(project => project.id === event.project_id)?.name ?? "Project"}</td><td>{event.actor_email}</td></tr>)}</tbody></table></div> : <ConsoleState eyebrow="SECURITY / CREDENTIAL HISTORY" title="No credential events" description="Key creation, rotation, and revocation events will be recorded here as they happen." />}</div></>}</>}</div></div><DeveloperMobileDock current="console" /></main>;
}
