import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/lib/tic/credentials") return { url: new URL("./fixtures/agentkey-route-mocks.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier === "@/lib/agentkey") return { url: new URL("./fixtures/agentkey-route-mocks.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier === "@/lib/agent-flow-policy" || specifier === "@/lib/bitget-market") return { url: new URL("./fixtures/agentkey-route-mocks.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier === "@/lib/agentkey-research") return nextResolve(new URL("../lib/agentkey-research.ts", import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const { POST } = await import("../app/api/v1/research/agentkey/route.ts");
hooks.deregister();

const query = "Use AgentKey to explain NVIDIA earnings using Yahoo Finance and Google News.";
function mockClient() {
  const calls = [];
  const article = { title: "NVIDIA earnings and guidance", url: "https://news.example/nvidia", publisher: "News Desk", publishedAt: new Date().toISOString(), snippet: "NVIDIA earnings release." };
  const client = {
    calls,
    async findTools(text) { calls.push(["find", text]); return { content: [{ type: "text", text: JSON.stringify({ tools: [{ name: "GoogleNews/search", summary: "Search Google News" }, { name: "yfinance/getChart", summary: "Yahoo Finance price chart" }] }) }] }; },
    async describeTool(name) { calls.push(["describe", name]); return { content: [{ type: "text", text: JSON.stringify(name.startsWith("Google") ? { cost: 1, inputSchema: { properties: { query: { type: "string" }, num: { type: "integer" } }, required: ["query"] } } : { cost: 2, inputSchema: { properties: { symbol: { type: "string" }, range: { type: "string", enum: ["1y"] }, interval: { type: "string", enum: ["1d"] } }, required: ["symbol"] } }) }] }; },
    async executeTool(name, params) { calls.push(["execute", name, params]); return { content: [{ type: "text", text: JSON.stringify(name.startsWith("Google") ? { results: [article] } : { chart: [{ close: 100 }, { close: 110 }] }) }] }; },
  };
  return client;
}

test("developer endpoint uses project scope, described AgentKey tools, and returns attributed research", async () => {
  const client = mockClient();
  globalThis.agentKeyRouteClient = client;
  globalThis.agentKeyRouteAuthCalls = [];
  globalThis.agentKeyRouteUsage = [];
  const response = await POST(new Request("https://api.tidelight.app/v1/research/agentkey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) }));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.provider, "agentkey");
  assert.deepEqual(result.tools.map(tool => tool.name), ["GoogleNews/search", "yfinance/getChart"]);
  assert.equal(result.sources[0].via, "AgentKey");
  assert.equal(result.tools[1].data.chart[1].close, 110);
  assert.deepEqual(client.calls.find(call => call[0] === "execute" && call[1] === "yfinance/getChart")[2], { symbol: "NVDA", range: "1y", interval: "1d" });
  assert.deepEqual(globalThis.agentKeyRouteAuthCalls, [{ path: "/v1/research/agentkey", scope: "research:run" }]);
  assert.deepEqual(globalThis.agentKeyRouteUsage, [{ usageId: "usage-agentkey", status: 200 }]);
  assert.equal(client.calls.filter(call => call[0] === "execute").length, 2);
});

test("developer endpoint rejects oversized and malformed input before any AgentKey calls", async () => {
  const client = mockClient();
  globalThis.agentKeyRouteClient = client;
  globalThis.agentKeyRouteUsage = [];
  const invalid = await POST(new Request("https://api.tidelight.app/v1/research/agentkey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "no" }) }));
  assert.equal(invalid.status, 400);
  assert.equal(client.calls.length, 0);
  const oversized = await POST(new Request("https://api.tidelight.app/v1/research/agentkey", { method: "POST", headers: { "content-type": "application/json" }, body: " ".repeat(9_000) }));
  assert.equal(oversized.status, 413);
  assert.deepEqual(globalThis.agentKeyRouteUsage.map(item => item.status), [400, 413]);
});
