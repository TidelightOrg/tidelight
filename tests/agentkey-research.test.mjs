import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/lib/agentkey") return nextResolve(new URL("../lib/agentkey.ts", import.meta.url).href);
  return nextResolve(specifier, context);
} });
const { gatherAgentKeyResearch, agentKeyResearchCandidates } = await import("../lib/agentkey-research.ts");
hooks.deregister();

const query = "Use AgentKey to explain NVIDIA's stock reaction to its latest earnings using Yahoo Finance and Google News.";
const catalog = { content: [{ type: "text", text: JSON.stringify({ tools: [
  { name: "GoogleNews/search", summary: "Search dated Google News articles" },
  { name: "yfinance/getChart", summary: "Read Yahoo Finance stock price history" },
  { name: "social/instagram/createPost", summary: "Create an Instagram post" },
] }) }] };

test("AgentKey discovers provider-specific read-only tools and uses their described schemas", async () => {
  const calls = [];
  const today = new Date().toISOString();
  const client = {
    async findTools(input) { calls.push(["find", input]); return catalog; },
    async describeTool(name) {
      calls.push(["describe", name]);
      if (name === "GoogleNews/search") return { content: [{ type: "text", text: JSON.stringify({ cost: 1, inputSchema: { type: "object", properties: { query: { type: "string" }, num: { type: "integer", maximum: 20 } }, required: ["query"] } }) }] };
      return { content: [{ type: "text", text: JSON.stringify({ cost: 2, inputSchema: { type: "object", properties: { symbol: { type: "string" }, range: { type: "string", enum: ["1mo", "1y"] }, interval: { type: "string", enum: ["1d", "1wk"] } }, required: ["symbol"] } }) }] };
    },
    async executeTool(name, params) {
      calls.push(["execute", name, params]);
      if (name === "GoogleNews/search") return { content: [{ type: "text", text: JSON.stringify({ results: [{ title: "NVIDIA shares rise after earnings", url: "https://news.example/nvidia", publisher: "News Desk", publishedAt: today, snippet: "NVIDIA reported earnings." }] }) }] };
      return { content: [{ type: "text", text: JSON.stringify({ chart: [{ close: 190 }] }) }] };
    },
  };

  assert.deepEqual(agentKeyResearchCandidates(catalog, query).map(item => item.name), ["GoogleNews/search", "yfinance/getChart"]);
  const result = await gatherAgentKeyResearch(query, client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools.map(item => item.name), ["GoogleNews/search", "yfinance/getChart"]);
  assert.deepEqual(calls.filter(item => item[0] === "execute").map(item => item.slice(1)), [
    ["GoogleNews/search", { query, num: 20 }],
    ["yfinance/getChart", { symbol: "NVDA", range: "1y", interval: "1d" }],
  ]);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].via, "AgentKey");
  assert.equal(result.sources[0].url, "https://news.example/nvidia");
});

test("AgentKey never executes a tool without a verified low-cost schema", async () => {
  const calls = [];
  const client = {
    async findTools() { return { tools: [{ name: "GoogleNews/search" }] }; },
    async describeTool() { return { content: [{ type: "text", text: JSON.stringify({ cost: 5, inputSchema: { properties: { query: { type: "string" } }, required: ["query"] } }) }] }; },
    async executeTool(...args) { calls.push(args); return {}; },
  };
  const result = await gatherAgentKeyResearch("Search Google News about NVIDIA", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.deepEqual(calls, []);
});

test("AgentKey does not silently omit a specifically requested provider", async () => {
  let executions = 0;
  const client = {
    async findTools() { return { tools: [{ name: "GoogleNews/search", summary: "Search dated Google News articles" }] }; },
    async describeTool() { return { cost: 1, inputSchema: { properties: { query: { type: "string" } }, required: ["query"] } }; },
    async executeTool() { executions++; return {}; },
  };
  const result = await gatherAgentKeyResearch(query, client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.equal(executions, 0);
});

test("mutation detection normalizes tool names and rejects described write operations", async () => {
  assert.deepEqual(agentKeyResearchCandidates({ tools: [{ name: "finance/create_order", summary: "Stock market tool" }] }), []);
  let executions = 0;
  const client = {
    async findTools() { return { tools: [{ name: "finance/getQuote", summary: "Read current stock quote" }] }; },
    async describeTool() { return { name: "finance/getQuote", description: "Create a stock order", cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }; },
    async executeTool() { executions++; return {}; },
  };
  const result = await gatherAgentKeyResearch("Get NVIDIA stock quote", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.equal(executions, 0);
});

test("financial schema fields named open, close, and execute_as do not look like operations", async () => {
  const client = {
    async findTools() { return { tools: [{ name: "yfinance/getChart", summary: "Read Yahoo Finance stock price history" }] }; },
    async describeTool() { return { name: "yfinance/getChart", description: "Read historical OHLC data", cost: 1, execute_as: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] }, outputSchema: { properties: { open: { type: "number" }, close: { type: "number" } } } }; },
    async executeTool() { return { chart: { open: 100, close: 110 } }; },
  };
  const result = await gatherAgentKeyResearch("Get Yahoo Finance chart for NVIDIA", client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools[0].data, { chart: { open: 100, close: 110 } });
});

test("all requested provider schemas and costs pass before any provider is executed", async () => {
  const calls = [];
  const client = {
    async findTools() { return catalog; },
    async describeTool(name) {
      if (name === "GoogleNews/search") return { cost: 5, inputSchema: { properties: { query: { type: "string" } }, required: ["query"] } };
      return { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } };
    },
    async executeTool(...args) { calls.push(args); return {}; },
  };
  const result = await gatherAgentKeyResearch(query, client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.deepEqual(calls, []);
});

test("all explicitly requested providers must return usable results", async () => {
  let executions = 0;
  const client = {
    async findTools() { return catalog; },
    async describeTool(name) {
      return name === "GoogleNews/search"
        ? { cost: 1, inputSchema: { properties: { query: { type: "string" } }, required: ["query"] } }
        : { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } };
    },
    async executeTool(name) { executions++; return name === "GoogleNews/search" ? { articles: [{ title: "NVIDIA", url: "https://news.example/nvda" }] } : undefined; },
  };
  const result = await gatherAgentKeyResearch(query, client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.deepEqual(result.tools, []);
  assert.equal(executions, 2);
});

test("unusable optional tools are skipped while valid tools still run", async () => {
  const calls = [];
  const client = {
    async findTools() { return { tools: [{ name: "finance/getQuote", summary: "Read current market quote" }, { name: "news/search", summary: "Search current financial news" }] }; },
    async describeTool(name) {
      if (name === "finance/getQuote") return { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } };
      return { cost: 5, inputSchema: { properties: { query: { type: "string" } }, required: ["query"] } };
    },
    async executeTool(name, args) { calls.push([name, args]); return { quote: { symbol: "NVDA" } }; },
  };
  const result = await gatherAgentKeyResearch("Get NVIDIA market data", client, "NVDA");
  assert.equal(result.state, "used");
  assert.equal(result.tools.length, 1);
  assert.equal(result.tools[0].name, "finance/getQuote");
  assert.deepEqual(calls.map(([name]) => name), ["finance/getQuote"]);
});

test("ticker enum mismatch rejects a tool instead of substituting another company", async () => {
  const calls = [];
  const client = {
    async findTools() { return { tools: [{ name: "finance/getQuote", summary: "Read current market quote" }] }; },
    async describeTool() { return { cost: 1, inputSchema: { properties: { symbol: { type: "string", enum: ["AAPL", "MSFT"] } }, required: ["symbol"] } }; },
    async executeTool(...args) { calls.push(args); return { quote: { symbol: args[1].symbol } }; },
  };
  const result = await gatherAgentKeyResearch("Get NVIDIA market data", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.deepEqual(calls, []);
});

test("structuredContent preserves deeply nested financial payloads", async () => {
  const payload = { chart: { result: [{ indicators: { quote: [{ close: [100, 102] }] } }] } };
  const client = {
    async findTools() { return { tools: [{ name: "yfinance/getChart", summary: "Read Yahoo Finance stock price history" }] }; },
    async describeTool() { return { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }; },
    async executeTool() { return { structuredContent: payload }; },
  };
  const result = await gatherAgentKeyResearch("Get Yahoo Finance chart for NVIDIA", client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools[0].data, payload);
});

test("plain text catalog discovery recognizes the legacy AgentKey search name", () => {
  assert.deepEqual(agentKeyResearchCandidates({ content: [{ type: "text", text: "agentkey_search — Search public news" }] }).map(item => item.name), ["agentkey_search"]);
});

test("unavailable AgentKey connections return a safe status", async () => {
  const result = await gatherAgentKeyResearch(query, { findTools: async () => { throw new Error("secret upstream response"); }, describeTool: async () => ({}), executeTool: async () => ({}) });
  assert.equal(result.state, "unavailable");
  assert.doesNotMatch(JSON.stringify(result), /secret upstream response/);
});
