import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/lib/agentkey") return nextResolve(new URL("../lib/agentkey.ts", import.meta.url).href, context);
  if (["./agentkey", "./agentkey-research", "./agent-flow-sources"].includes(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { agentKeyIssuerEvidence, agentKeyIssuerResearch } = await import("../lib/agentkey-flow-sources.ts");
hooks.deregister();

const today = new Date().toISOString();
function client({ cost = 1, result, discover = "agentkey_search", fail = false } = {}) {
  const calls = [];
  return { calls, api: {
    async findTools(query) { calls.push(["find", query]); return { content: [{ text: JSON.stringify({ tools: [{ name: discover }] }) }] }; },
    async describeTool(name) { calls.push(["describe", name]); return { content: [{ text: JSON.stringify({ name, cost, inputSchema: { type: "object", properties: { query: { type: "string" }, type: { type: "string", enum: ["news", "social"] }, num: { type: "integer", maximum: 20 } }, required: ["query", "type"] } }) }] }; },
    async executeTool(name, params) { calls.push(["execute", name, params]); if (fail) throw new Error("no service"); return { content: [{ text: JSON.stringify(result) }] }; },
  } };
}

test("AgentKey admits attributable, relevant HTTPS headlines with provenance and bounded tool params", async () => {
  const { api, calls } = client({ result: { results: [
    { title: "NVDA earnings outlook", url: "https://publisher.example/news", publisher: "Publisher", publishedAt: today, snippet: "NVDA result" },
    { title: "unrelated story", url: "https://publisher.example/unrelated", publishedAt: today },
    { title: "NVDA link without date", url: "https://publisher.example/undated" },
    { title: "NVDA unsafe link", url: "http://publisher.example/a", publishedAt: today },
  ] } });
  const evidence = await agentKeyIssuerEvidence("NVDA", "NVIDIA", api);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].via, "AgentKey");
  assert.equal(calls[2][1], "agentkey_search");
  assert.deepEqual(calls[2][2], { query: "Find recent news about NVIDIA (NVDA), including earnings, guidance, and market reaction.", type: "news", num: 20 });
});

test("AgentKey issuer research does not append search noise to the source query", async () => {
  const question = "Use AgentKey to explain NVIDIA's stock reaction to its latest earnings using Google News.";
  const { api, calls } = client({ result: { news: [] } });
  await agentKeyIssuerResearch("NVDA", "NVIDIA", api, question);
  assert.deepEqual(calls[0], ["find", question]);
});

test("AgentKey issuer results preserve the execution state for diagnostics", async () => {
  const { api } = client({ result: { results: [] } });
  const result = await agentKeyIssuerResearch("NVDA", "NVIDIA", api);
  assert.equal(result.state, "used");
  assert.equal(result.tools.length, 1);
  assert.deepEqual(result.sources, []);
});

test("AgentKey accepts the canonical issuer name when market metadata includes a legal suffix", async () => {
  const { api } = client({ result: { results: [{
    title: "Nvidia stock reacts after earnings",
    url: "https://publisher.example/nvidia-earnings",
    publisher: "Publisher",
    publishedAt: today,
    snippet: "Investors reassessed NVIDIA after the report.",
  }] } });
  const evidence = await agentKeyIssuerEvidence("NVDA", "NVIDIA Corporation", api);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].title, "Nvidia stock reacts after earnings");
});

test("no execution with undiscovered tool or ambiguous and over-budget cost", async () => {
  for (const options of [{ discover: "agentkey_social" }, { cost: 3 }, { cost: "unknown" }]) {
    const { api, calls } = client(options);
    assert.deepEqual(await agentKeyIssuerEvidence("TSLA", "Tesla", api), []);
    assert.equal(calls.some(([name]) => name === "execute"), false);
  }
});

test("upstream failure returns empty evidence so public feeds can continue", async () => {
  const { api } = client({ fail: true });
  assert.deepEqual(await agentKeyIssuerEvidence("NVDA", "NVIDIA", api), []);
});

test("legacy AgentKey search still requires a described execution schema", async () => {
  const { calls, api } = client({ discover: "agentkey_search" });
  api.describeTool = async name => { calls.push(["describe", name]); return { content: [{ text: JSON.stringify({ name, cost: 1 }) }] }; };
  assert.deepEqual(await agentKeyIssuerEvidence("NVDA", "NVIDIA", api), []);
  assert.equal(calls.some(([name]) => name === "execute"), false);
});

test("AgentKey evidence uses the same 30-day current window as public-feed snapshots", async () => {
  const oldArticle = { title: "NVDA earnings results", url: "https://publisher.example/old", publisher: "Publisher", publishedAt: new Date(Date.now() - 180 * 86_400_000).toISOString(), snippet: "NVDA earnings results." };
  const { api } = client({ result: { results: [oldArticle] } });
  assert.deepEqual(await agentKeyIssuerEvidence("NVDA", "NVIDIA", api), []);
  const historical = await agentKeyIssuerEvidence("NVDA", "NVIDIA", api, "Find NVDA 2026 earnings results");
  assert.equal(historical.length, 1);
});

test("relative Serper news dates admit recent headlines but not old or undated items", async () => {
  const now = Date.now();
  const { api } = client({ result: { news: [
    { title: "NVDA earnings reaction", link: "https://publisher.example/recent", source: "Publisher", date: "3 hours ago" },
    { title: "NVDA earnings earlier", link: "https://publisher.example/older", source: "Publisher", date: "5 weeks ago" },
    { title: "NVDA earnings unknown", link: "https://publisher.example/undated", source: "Publisher", date: "recently" },
  ] } });
  const evidence = await agentKeyIssuerEvidence("NVDA", "NVIDIA", api);
  assert.deepEqual(evidence.map(item => item.url), ["https://publisher.example/recent"]);
  assert.ok(Math.abs(Date.parse(evidence[0].publishedAt) - (now - 3 * 3_600_000)) < 10_000);
});
