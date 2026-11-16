import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/lib/agentkey") return nextResolve(new URL("../lib/agentkey.ts", import.meta.url).href, context);
  if (["./agentkey", "./agentkey-research", "./agent-flow-sources"].includes(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { agentKeyIssuerEvidence } = await import("../lib/agentkey-flow-sources.ts");
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
  assert.deepEqual(calls[2][2], { query: "Find recent news about NVIDIA (NVDA), including earnings, guidance, and market reaction. Include public, dated, attributable sources for NVIDIA (NVDA).", type: "news", num: 20 });
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
