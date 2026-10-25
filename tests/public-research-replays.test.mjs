import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public replay storage is token-addressed, expiry-bounded, and server-write-only", async () => {
  const sql = await read("../supabase/migrations/20261021123000_public_research_replays.sql");
  assert.match(sql, /public_id uuid not null unique default gen_random_uuid\(\)/);
  assert.match(sql, /alter table public\.public_research_replays enable row level security/i);
  assert.match(sql, /grant select \(public_id, payload, created_at, expires_at, revoked_at\) on public\.public_research_replays to anon, authenticated/i);
  assert.doesNotMatch(sql, /grant insert[^;]*to anon/i);
  assert.match(sql, /expires_at > now\(\)/i);
  assert.match(sql, /revoked_at is null/i);
  assert.doesNotMatch(sql, /grant insert|grant update|grant delete/i);
  assert.doesNotMatch(sql, /for insert to authenticated|for update to authenticated|for delete to authenticated/i);
});

test("public export is an explicit owner action and strips private route context and order controls", async () => {
  const route = await read("../app/api/research/replays/route.ts");
  const control = await read("../app/ui/research-replay-share.tsx");
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(route, /\.eq\("status", "complete"\)/);
  assert.match(route, /https:/);
  assert.match(route, /sources: publicSources/);
  assert.match(route, /createAdminClient\(\)/);
  assert.match(route, /existing/);
  assert.doesNotMatch(route, /workspaceContext|\.handoff|email|user\.email/);
  assert.match(control, /order controls are excluded/);
  assert.match(control, /Links expire after 30 days and can be revoked/);
  assert.match(control, /aria-modal="true" aria-labelledby="replay-share-title"/);
  assert.match(control, /loadLinks\(\)/);
  assert.match(control, /No public replays yet/);
});

test("public replay access filters expiry and revocation, with owner-authenticated revoke", async () => {
  const route = await read("../app/api/research/replays/[token]/route.ts");
  const page = await read("../app/replay/[token]/page.tsx");
  assert.match(route, /\.is\("revoked_at", null\)/);
  assert.match(route, /\.gt\("expires_at"/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /index: false, follow: false/);
  assert.match(page, /Model-reported score, not a calibrated probability/);
  assert.doesNotMatch(page, /\b(?:asset|row)\.(?:handoff|portfolio|credentials)\b/i);
});

test("publishing requires the owning session and serializes only cited public evidence and safe market fields", async () => {
  const token = "d475bd46-5035-4ae5-9f19-e2959a4f0734";
  const calls = [];
  const context = { user: { id: "owner-1" }, run: { question: "Review NVDA after the latest issuer update", completed_at: new Date().toISOString(), status: "complete", summary: { trace: [{ agent: "Evidence scout", status: "complete", title: "Sources collected", detail: "Private route /account/secret", at: new Date().toISOString() }], assets: [{ ticker: "NVDA", issuer: "NVIDIA", summary: "A sourced interpretation.", stance: "unclear", confidence: .4, confidenceCapped: true, tradeable: false, handoff: { destinations: ["private route"] }, gateReasons: ["Evidence incomplete"], evidenceBalance: { supporting: [{ text: "Source-backed support.", citedUrls: ["https://news.example/story", "https://unsafe.example/forged"] }], counter: [{ text: "Source-backed challenge.", citedUrls: ["https://news.example/story"] }] }, sources: [{ url: "https://news.example/story" }, { url: "http://unsafe.example/story" }], market: { perpSymbol: "NVDAUSDT", spotSymbol: "rNVDAUSDT", lastPrice: 123, providerTimestamp: 1234, accountId: "private" }, risks: ["Counter evidence"], nextCheck: "Review the issuer filing" }], account: "private", workspaceContext: "/account/secret" } } };
  const query = (table) => ({
    columns: "", values: null, filters: [],
    select(columns) { this.columns = columns; return this; },
    eq(column, value) { this.filters.push([column, value]); return this; },
    is(column, value) { this.filters.push([column, value]); return this; },
    gt(column, value) { this.filters.push([column, value]); return this; },
    lte(column, value) { this.filters.push([column, value]); return this; },
    order() { return this; },
    update(values) { this.values = values; return this; },
    limit() { return this; },
    maybeSingle() { const owned = this.filters.some(([column, value]) => column === "user_id" && value === context.user.id); return Promise.resolve({ data: table === "research_runs" && owned ? context.run : null, error: null }); },
    insert(values) { this.values = values; calls.push({ table, values }); return this; },
    single() { return Promise.resolve({ data: { public_id: token, expires_at: this.values.expires_at }, error: null }); },
    then(resolve, reject) { return Promise.resolve({ data: table === "research_sources" ? [{ url: "https://news.example/story", title: "Story", publisher: "News", published_at: null, retrieved_at: new Date().toISOString() }, { url: "http://unsafe.example/story", title: "Unsafe", publisher: "Unsafe", published_at: null, retrieved_at: new Date().toISOString() }, { url: "https://not-cited.example/story", title: "Not cited", publisher: "Other", published_at: null, retrieved_at: new Date().toISOString() }] : [], error: null }).then(resolve, reject); },
  });
  globalThis.replayTest = { context, calls, db: { auth: { getUser: async () => ({ data: { user: context.user } }) }, from: query } };
  const mocks = {
    "next/server": "export const NextResponse=class extends Response { static json(data,init={}) { return Response.json(data,init); } };",
    "@/lib/supabase/server": "export const createClient=async()=>globalThis.replayTest.db;",
    "@/lib/supabase/admin": "export const createAdminClient=()=>globalThis.replayTest.db;",
  };
  const hooks = registerHooks({ resolve(specifier, resolutionContext, nextResolve) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier, resolutionContext);
  } });
  const route = await import("../app/api/research/replays/route.ts?test=public-replay");
  hooks.deregister();
  try {
    const response = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(response.status, 200);
    assert.match((await response.json()).url, new RegExp(token));
    const payload = calls.find(call => call.table === "public_research_replays").values.payload;
    assert.equal(payload.sources.length, 1);
    assert.equal(payload.sources[0].url, "https://news.example/story");
    assert.equal(payload.assets[0].market.symbol, "NVDAUSDT");
    assert.deepEqual(payload.assets[0].evidenceBalance.supporting[0].citedUrls, ["https://news.example/story"]);
    assert.equal("accountId" in payload.assets[0].market, false);
    assert.equal("handoff" in payload.assets[0], false);
    assert.equal("account" in payload, false);
    assert.equal(JSON.stringify(payload).includes("/account/secret"), false);

    context.run.summary = { assets: [{ ticker: "rNVDA", issuer: "NVIDIA", summary: "A public token pulse with linked sources.", sources: [{ url: "https://news.example/story" }], stance: "unclear", confidence: 0.3 }] };
    const tokenPulseResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(tokenPulseResponse.status, 200);
    const tokenPulsePayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.equal(tokenPulsePayload.assets[0].ticker, "rNVDA");
    assert.deepEqual(tokenPulsePayload.assets[0].sources, ["https://news.example/story"]);

    // Earlier saved overview pulses used a descriptive symbol/name/overview shape.
    // It remains publishable while arbitrary fields and unlineaged sources stay private.
    context.run.summary = { assets: [{ symbol: "S&P 500", name: "Index pulse", overview: "A public, source-linked market snapshot.", sources: ["https://news.example/story", "https://forged.example/story"], accountId: "private" }] };
    const legacyPulseResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(legacyPulseResponse.status, 200);
    const legacyPulsePayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.equal(legacyPulsePayload.assets[0].ticker, "S&P 500");
    assert.equal(legacyPulsePayload.assets[0].issuer, "Index pulse");
    assert.equal(legacyPulsePayload.assets[0].summary, "A public, source-linked market snapshot.");
    assert.deepEqual(legacyPulsePayload.assets[0].sources, ["https://news.example/story"]);
    assert.equal(JSON.stringify(legacyPulsePayload).includes("accountId"), false);

    // Overview accepts full company names up to 80 characters; publishing should
    // preserve that same safe, human-readable label rather than requiring a ticker.
    context.run.summary = { assets: [{ symbol: "Johnson & Johnson, Inc.", name: "Johnson & Johnson, Inc.", overview: "A public, source-linked company research snapshot.", sources: ["https://news.example/story"] }] };
    const companyNameResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(companyNameResponse.status, 200);
    const companyNamePayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.equal(companyNamePayload.assets[0].ticker, "Johnson & Johnson, Inc.");

    context.run.summary = { assets: [{ symbol: "International Business Machines Corporation", name: "IBM", overview: "A public, source-linked company research snapshot.", sources: ["https://news.example/story"] }] };
    const longCompanyNameResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(longCompanyNameResponse.status, 200);
    const longCompanyNamePayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.equal(longCompanyNamePayload.assets[0].ticker, "International Business Machines Corporation");

    context.run.summary = { summary: "An evidence-first public brief.", sources: [{ url: "https://news.example/story" }], claims: [{ claim: "A source-backed claim.", quote: "A short quotation.", sourceUrl: "https://news.example/story" }] };
    const evidenceBriefResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(evidenceBriefResponse.status, 200);
    const evidenceBriefPayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.equal(evidenceBriefPayload.assets[0].ticker, "NVDA");
    assert.deepEqual(evidenceBriefPayload.assets[0].sources, ["https://news.example/story"]);
    assert.deepEqual(evidenceBriefPayload.assets[0].evidenceBalance.supporting[0].citedUrls, ["https://news.example/story"]);
    context.run.summary = { ...context.run.summary, claims: [{ claim: "A legacy source-linked claim.", quote: "A matching archived quotation.", source_url: "https://news.example/story" }] };
    const legacyEvidenceBriefResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(legacyEvidenceBriefResponse.status, 200);
    const legacyEvidencePayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.deepEqual(legacyEvidencePayload.assets[0].evidenceBalance.supporting[0].citedUrls, ["https://news.example/story"]);

    context.run.summary = { assets: [{ ticker: "NVDA", issuer: "NVIDIA", summary: "A normalized market record.", sources: ["https://news.example/story"], market: { symbol: "NVDAUSDT", price: 140, timestamp: "2026-10-24T14:00:00Z" } }] };
    const normalizedMarketResponse = await route.POST(new Request("https://tidelight.app/api/research/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchRunId: token }) }));
    assert.equal(normalizedMarketResponse.status, 200);
    const normalizedMarketPayload = calls.filter(call => call.table === "public_research_replays").at(-1).values.payload;
    assert.deepEqual(normalizedMarketPayload.assets[0].market, { symbol: "NVDAUSDT", price: 140, providerTimestamp: Date.parse("2026-10-24T14:00:00Z") });
  } finally { delete globalThis.replayTest; }
});
