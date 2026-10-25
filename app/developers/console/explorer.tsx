"use client";

import { useMemo, useState } from "react";

type Project = { id: string; name: string };
type Key = { id: string; project_id: string; name: string; environment: string; scopes: string[]; revoked_at: string | null; expires_at: string | null };
type Language = "curl" | "typescript" | "python";
type Endpoint = "market" | "research";
type ExplorerHistoryEntry = { id: string; endpoint: Endpoint; ticker: string; createdAt: string; status: number | null; duration: number; requestId: string; result: unknown };

const languages: Language[] = ["curl", "typescript", "python"];

export default function ApiExplorer({ projects, keys, currentTime, onViewResearch }: { projects: Project[]; keys: Key[]; currentTime: number; onViewResearch: () => void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [keyId, setKeyId] = useState("");
  const [endpoint, setEndpoint] = useState<Endpoint>("market");
  const [limit, setLimit] = useState(20);
  const [cursor, setCursor] = useState("");
  const [underlyingTicker, setUnderlyingTicker] = useState("");
  const [researchIdempotencyKey, setResearchIdempotencyKey] = useState("");
  const [language, setLanguage] = useState<Language>("curl");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [requestId, setRequestId] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [history, setHistory] = useState<ExplorerHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState("");
  const scope = endpoint === "market" ? "market:read" : "research:run";
  const availableKeys = keys.filter(key => key.project_id === projectId && key.scopes?.includes(scope) && !key.revoked_at && (!key.expires_at || Date.parse(key.expires_at) > currentTime));
  const selectedKeyId = availableKeys.some(key => key.id === keyId) ? keyId : availableKeys[0]?.id ?? "";
  const snippet = useMemo(() => {
    const safeIdempotencyKey = /^[A-Za-z0-9._:-]{8,128}$/.test(researchIdempotencyKey) ? researchIdempotencyKey : "your-unique-request-id";
    if (endpoint === "research") {
      if (language === "typescript") return `import { randomUUID } from "node:crypto";\nimport { TidelightClient } from "@tidelight/sdk";\n\nconst client = new TidelightClient({ apiKey: process.env.TIDELIGHT_API_KEY! });\nconst idempotencyKey = randomUUID(); // create once per job and reuse for retries\nconst job = await client.startCompanyResearch("${underlyingTicker.toUpperCase() || "NVDA"}", idempotencyKey);\nconsole.log(job.job_id, job.status);`;
      if (language === "python") return `import os\nfrom uuid import uuid4\nfrom tidelight import Client\n\nclient = Client(os.environ["TIDELIGHT_API_KEY"])\nidempotency_key = str(uuid4())  # create once per job and reuse for retries\njob = client.start_company_research("${underlyingTicker.toUpperCase() || "NVDA"}", idempotency_key)\nprint(job["job_id"], job["status"])`;
      return `curl 'https://api.tidelight.app/v1/research/jobs' \\\n  -X POST \\\n  -H 'Authorization: Bearer YOUR_TIDELIGHT_KEY' \\\n  -H 'Idempotency-Key: ${safeIdempotencyKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"ticker":"${underlyingTicker.toUpperCase() || "NVDA"}"}'`;
    }
    const safeCursor = /^[A-Z0-9]{2,32}$/.test(cursor) ? cursor : "";
    const safeTicker = /^[A-Z][A-Z0-9.]{0,9}$/i.test(underlyingTicker) ? underlyingTicker.toUpperCase() : "";
    const query = `kind=rtoken&limit=${limit}${safeTicker ? `&underlying_ticker=${encodeURIComponent(safeTicker)}` : ""}${safeCursor ? `&cursor=${encodeURIComponent(safeCursor)}` : ""}`;
    if (language === "typescript") return `import { TidelightClient } from "@tidelight/sdk";\n\nconst client = new TidelightClient({ apiKey: process.env.TIDELIGHT_API_KEY! });\nconst page = await client.listTokenizedEquities({ limit: ${limit}${safeTicker ? `, underlyingTicker: "${safeTicker}"` : ""}${safeCursor ? `, cursor: "${safeCursor}"` : ""} });\nconsole.log(page.data);`;
    if (language === "python") return `import os\nfrom tidelight import Client\n\nclient = Client(os.environ["TIDELIGHT_API_KEY"])\npage = client.list_tokenized_equities(limit=${limit}${safeTicker ? `, underlying_ticker="${safeTicker}"` : ""}${safeCursor ? `, cursor="${safeCursor}"` : ""})\nprint(page.data)`;
    return `curl 'https://api.tidelight.app/v1/market/instruments?${query}' \\\n  -H 'Authorization: Bearer YOUR_TIDELIGHT_KEY'`;
  }, [cursor, endpoint, language, limit, researchIdempotencyKey, underlyingTicker]);

  async function execute(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setStatus(null);
    setRequestId("");
    setDuration(null);
    const began = performance.now();
    try {
      const idempotencyKey = researchIdempotencyKey || crypto.randomUUID();
      if (endpoint === "research" && !researchIdempotencyKey) setResearchIdempotencyKey(idempotencyKey);
      const response = await fetch(endpoint === "market" ? "/api/developers/explore" : "/api/developers/explore-research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(endpoint === "market" ? { keyId: selectedKeyId, kind: "rtoken", limit, cursor: cursor || null, underlyingTicker: underlyingTicker || null } : { keyId: selectedKeyId, ticker: underlyingTicker || "NVDA", idempotencyKey }) });
      const body = await response.json();
      const nextRequestId = body.request_id ?? body.error?.request_id ?? response.headers.get("x-request-id") ?? "";
      const elapsed = typeof body.duration_ms === "number" ? body.duration_ms : Math.round(performance.now() - began);
      const entry: ExplorerHistoryEntry = { id: crypto.randomUUID(), endpoint, ticker: underlyingTicker.trim() || (endpoint === "research" ? "NVDA" : "All instruments"), createdAt: new Date().toISOString(), status: response.status, duration: elapsed, requestId: nextRequestId, result: body };
      setStatus(response.status);
      setResult(body);
      setRequestId(nextRequestId);
      setDuration(elapsed);
      setHistory(current => [entry, ...current].slice(0, 6));
      setActiveHistoryId(entry.id);
    } catch {
      const errorResult = { error: { code: "network_error", message: "The API explorer could not reach Tidelight. Check your connection and try again." } };
      const elapsed = Math.round(performance.now() - began);
      const entry: ExplorerHistoryEntry = { id: crypto.randomUUID(), endpoint, ticker: underlyingTicker.trim() || (endpoint === "research" ? "NVDA" : "All instruments"), createdAt: new Date().toISOString(), status: null, duration: elapsed, requestId: "", result: errorResult };
      setStatus(null);
      setResult(errorResult);
      setRequestId("");
      setDuration(elapsed);
      setHistory(current => [entry, ...current].slice(0, 6));
      setActiveHistoryId(entry.id);
    } finally {
      setBusy(false);
    }
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  function showHistoryEntry(entry: ExplorerHistoryEntry) {
    setActiveHistoryId(entry.id);
    setStatus(entry.status);
    setResult(entry.result);
    setRequestId(entry.requestId);
    setDuration(entry.duration);
  }

  return <>
    <p className="tic-eyebrow">DEVELOPER TOOLS / API EXPLORER</p>
    <h1>Explore the API</h1>
    <p className="tic-lead">Make an authorized request using an active project key. The secret stays hidden; this console checks your account and applies the same key quota.</p>
    <form className="tic-explorer-form" onSubmit={execute}>
      <label>Endpoint<select value={endpoint} onChange={event => { const nextEndpoint = event.target.value as Endpoint; setEndpoint(nextEndpoint); if (nextEndpoint === "research") setResearchIdempotencyKey(crypto.randomUUID()); setKeyId(""); setResult(null); setStatus(null); }}><option value="market">Market instruments · market:read</option><option value="research">Company research job · research:run</option></select></label>
      <div className="tic-explorer-route"><span>REQUEST</span><code><b>{endpoint === "market" ? "GET" : "POST"}</b> {endpoint === "market" ? "/v1/market/instruments" : "/v1/research/jobs"}</code><small>{endpoint === "market" ? "Tokenized equity instruments" : "Queue a read-only issuer research snapshot"}</small></div>
      <label>Project<select value={projectId} onChange={event => { setProjectId(event.target.value); setKeyId(""); }}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label>Credential<select value={selectedKeyId} onChange={event => setKeyId(event.target.value)} required>{availableKeys.length ? availableKeys.map(key => <option key={key.id} value={key.id}>{key.name} · {key.environment}</option>) : <option value="">No active {scope} key</option>}</select></label>
      {endpoint === "market" ? <>
        <label>Limit<input type="number" min="1" max="100" value={limit} onChange={event => setLimit(Number(event.target.value))} required /></label>
        <label>Underlying ticker <span>(optional)</span><input value={underlyingTicker} onChange={event => { const nextTicker = event.target.value.toUpperCase(); if (nextTicker !== underlyingTicker) setResearchIdempotencyKey(crypto.randomUUID()); setUnderlyingTicker(nextTicker); }} pattern="[A-Z][A-Z0-9.]{0,9}" placeholder="e.g. AAPL" /></label>
        <label>Cursor <span>(optional)</span><input value={cursor} onChange={event => setCursor(event.target.value.toUpperCase())} pattern="[A-Z0-9]{2,32}" placeholder="Next cursor from a response" /></label>
      </> : <>
        <label>Company ticker<input value={underlyingTicker} onChange={event => { const nextTicker = event.target.value.toUpperCase(); if (nextTicker !== underlyingTicker) setResearchIdempotencyKey(crypto.randomUUID()); setUnderlyingTicker(nextTicker); }} pattern="[A-Z][A-Z0-9.]{0,9}" placeholder="NVDA" maxLength={10} /></label>
        <label>Idempotency key <span>(reuse for retries)</span><input value={researchIdempotencyKey} onChange={event => { setResearchIdempotencyKey(event.target.value); setCopyState("idle"); }} pattern="[A-Za-z0-9._:-]{8,128}" minLength={8} maxLength={128} placeholder="Generated on first request" /></label>
        <button type="button" className="tic-button tic-secondary tic-explorer-new-key" onClick={() => { setResearchIdempotencyKey(crypto.randomUUID()); setCopyState("idle"); }}>Generate new key</button>
      </>}
      <button type="submit" className="tic-button tic-primary" disabled={busy || !selectedKeyId} aria-busy={busy}>{busy ? <><span className="tic-explorer-spinner" aria-hidden="true" />Executing request…</> : "Execute request"}</button>
    </form>
    {!projects.length && <p className="tic-explorer-hint">Create a project and an API key to start.</p>}
    {projects.length > 0 && !availableKeys.length && <p className="tic-explorer-hint">Issue an active key with <code>{scope}</code> access for this project to start.</p>}
    {endpoint === "research" && status !== null && status < 400 && typeof result === "object" && result !== null && "job_id" in result && <div className="tic-explorer-hint" role="status">Research job queued. <button type="button" onClick={onViewResearch}>Open research jobs</button> to follow its status and result.</div>}

    <section className="tic-panel tic-explorer-reference" aria-labelledby="tic-reference-title">
      <div className="tic-panel-head"><div><p className="tic-explorer-kicker">REQUEST REFERENCE</p><h2 id="tic-reference-title">{endpoint === "market" ? "Market instruments" : "Company research job"}</h2></div><code>{scope}</code></div>
      <p className="tic-reference-intro">{endpoint === "market" ? "List tokenized equity instruments. Results are paginated and reflect the current public market catalog." : "Queue an issuer research snapshot. The response confirms the job was accepted; follow its status in Research jobs."}</p>
      <dl>
        {endpoint === "market" ? <>
          <div><dt><code>limit</code></dt><dd>Optional · 1–100 results per page. Defaults to 20.</dd></div>
          <div><dt><code>underlying_ticker</code></dt><dd>Optional · Filter by an underlying equity ticker, such as AAPL.</dd></div>
          <div><dt><code>cursor</code></dt><dd>Optional · Use the next cursor returned by a previous response.</dd></div>
        </> : <>
          <div><dt><code>ticker</code></dt><dd>Required · Company ticker to research. The explorer uses NVDA when left blank.</dd></div>
          <div><dt><code>Idempotency-Key</code></dt><dd>Required by the API · The explorer keeps this key for retries. Editing the ticker clears it; generate a new key to start a separate job.</dd></div>
        </>}
        <div><dt>Authorization</dt><dd>Uses the selected project credential. Its required scope is <code>{scope}</code>; the secret is never shown in this page.</dd></div>
      </dl>
    </section>

    <section className="tic-panel tic-explorer-output" aria-labelledby="tic-response-title">
      <div className="tic-panel-head"><div><p className="tic-explorer-kicker">LIVE REQUEST OUTPUT</p><h2 id="tic-response-title">Response</h2></div>{status !== null && <span className={status < 400 ? "tic-response-ok" : "tic-response-error"}>HTTP {status}</span>}</div>
      {busy ? <div className="tic-response-state" role="status"><span className="tic-explorer-spinner" aria-hidden="true" /><div><strong>Request in progress</strong><p>Waiting for the authorized API response…</p></div></div> : result ? <>
        <div className="tic-response-meta"><span>Request ID <code>{requestId || "Unavailable"}</code></span><span>Response time <code>{duration ?? "—"} ms</code></span><span>Usage <code>{typeof result === "object" && result !== null && "usage" in result && result.usage && typeof result.usage === "object" && "requests" in result.usage && result.usage.requests === 1 ? "1 request" : "Unavailable"}</code></span></div>
        <pre tabIndex={0} aria-label="JSON response"><code>{JSON.stringify(result, null, 2)}</code></pre>
      </> : <div className="tic-response-empty"><span aria-hidden="true" /><div><strong>Your response will appear here</strong><p>Run the request to inspect live data, request metadata, and any API errors.</p></div></div>}
    </section>

    {history.length > 0 && <section className="tic-panel tic-explorer-history" aria-labelledby="tic-history-title">
      <div className="tic-panel-head"><div><p className="tic-explorer-kicker">THIS TAB</p><h2 id="tic-history-title">Recent requests</h2></div><button className="tic-history-clear" type="button" onClick={() => { setHistory([]); setActiveHistoryId(""); }}>Clear</button></div>
      <ol className="tic-explorer-history-list">{history.map(entry => <li key={entry.id} className={entry.id === activeHistoryId ? "is-active" : ""}><div><b>{entry.endpoint === "market" ? "Market instruments" : "Company research job"} · {entry.ticker}</b><small>{new Date(entry.createdAt).toLocaleString()} · {entry.status === null ? "Network error" : `HTTP ${entry.status}`} · {entry.duration} ms</small></div><button type="button" aria-pressed={entry.id === activeHistoryId} onClick={() => showHistoryEntry(entry)}>View response</button></li>)}</ol>
      <p className="tic-history-note">History stays in memory for this page session and clears when you leave.</p>
    </section>}

    <section className="tic-panel tic-code-example" aria-labelledby="tic-code-title">
      <div className="tic-panel-head"><div><p className="tic-explorer-kicker">READY-TO-USE EXAMPLE</p><h2 id="tic-code-title">Use it in your application</h2></div><button type="button" onClick={() => void copySnippet()} aria-live="polite">{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy code"}</button></div>
      <div className="tic-code-tabs" aria-label="Choose code language">{languages.map(item => <button key={item} type="button" aria-pressed={language === item} onClick={() => { setLanguage(item); setCopyState("idle"); }}>{item === "typescript" ? "TypeScript" : item === "python" ? "Python" : "curl"}</button>)}</div>
      <pre tabIndex={0} aria-label={`${language} example code`}><code>{snippet}</code></pre>
      <p>Use a server environment variable for your key. Never put a secret in browser code.</p>
    </section>
  </>;
}
