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

test("AgentKey discovers provider-specific tools and uses the documented params schema", async () => {
  const calls = [];
  const today = new Date().toISOString();
  const client = {
    async findTools(input) { calls.push(["find", input]); return catalog; },
    async describeTool(name) {
      calls.push(["describe", name]);
      const news = name === "GoogleNews/search";
      const description = {
        name,
        cost: { credits_per_call: news ? 0.2 : 2 },
        health: { healthy: true },
        params: news
          ? { type: "object", properties: { q: { type: "string" }, num: { type: "integer", maximum: 20 } }, required: ["q"] }
          : { type: "object", properties: { symbol: { type: "string" }, range: { type: "string", enum: ["1mo", "1y"] }, interval: { type: "string", enum: ["1d", "1wk"] }, includePrePost: { type: "boolean", description: "Include candles after market close" } }, required: ["symbol"] },
        execute_as: { name, params: news ? { q: "<Search query>" } : { symbol: "<Stock symbol>" } },
      };
      return { content: [{ type: "text", text: JSON.stringify(description) }] };
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
    ["GoogleNews/search", { q: "NVIDIA's stock reaction to its latest earnings", num: 20 }],
    ["yfinance/getChart", { symbol: "NVDA", range: "1y", interval: "1d" }],
  ]);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].via, "AgentKey");
  assert.equal(result.sources[0].url, "https://news.example/nvidia");
});

test("Google News remains in search terms when it is the research subject", async () => {
  let executedQuery = "";
  const client = {
    async findTools() { return { tools: [{ name: "GoogleNews/search", summary: "Search news articles" }] }; },
    async describeTool() { return { name: "GoogleNews/search", cost: 1, params: { properties: { q: { type: "string" } }, required: ["q"] } }; },
    async executeTool(_name, params) { executedQuery = params.q; return { news: [] }; },
  };
  await gatherAgentKeyResearch("Use AgentKey to find Google News antitrust lawsuits", client);
  assert.equal(executedQuery, "Google News antitrust lawsuits");
});

test("AgentKey extracts article links through unknown wrappers and headline aliases", async () => {
  const client = {
    async findTools() { return { tools: [{ name: "GoogleNews/search", summary: "Search dated Google News articles" }] }; },
    async describeTool() { return { name: "GoogleNews/search", cost: 1, params: { properties: { q: { type: "string" } }, required: ["q"] } }; },
    async executeTool() {
      return { structuredContent: { response: { payload: { records: [{ headline: "NVIDIA earnings reaction", canonical_url: "https://news.example/nvidia", source: { name: "News Desk" }, excerpt: "Shares fell after earnings." }] } } } };
    },
  };
  const result = await gatherAgentKeyResearch("Search Google News about NVIDIA earnings", client, "NVDA");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].title, "NVIDIA earnings reaction");
  assert.equal(result.sources[0].publisher, "News Desk");
  assert.equal(result.sources[0].url, "https://news.example/nvidia");
  assert.equal(result.sources[0].snippet, "Shares fell after earnings.");
});

test("AgentKey skips metered tools whose advertised price is only a minimum", async () => {
  const client = {
    async findTools() { return { tools: [{ name: "GoogleNews/search" }] }; },
    async describeTool() {
      return { cost: { credits_per_call: 1, metered: true, credits_minimum: 1 }, params: { properties: { q: { type: "string" } }, required: ["q"] } };
    },
    async executeTool() { assert.fail("Metered tool should not execute"); },
  };
  const result = await gatherAgentKeyResearch("Search Google News about NVIDIA", client, "NVDA");
  assert.equal(result.reason, "no-usable-schema");
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

test("market-data prose about open, close, buy, sell, and sets remains read-only", async () => {
  const client = {
    async findTools() { return { tools: [{ name: "yfinance/getChart", summary: "Stock chart" }] }; },
    async describeTool() { return { name: "yfinance/getChart", description: "Read a set of open and close prices, with buy and sell ratings", cost: { credits_per_call: 1 }, params: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }; },
    async executeTool() { return { chart: [] }; },
  };
  const result = await gatherAgentKeyResearch("Get Yahoo Finance chart for NVIDIA", client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools.map(tool => tool.name), ["yfinance/getChart"]);
});

test("a neutral research tool described as writing or executing changes stays blocked", async () => {
  for (const description of ["Write the stock research report to your workspace", "Execute a report upload to the workspace"]) {
    const client = {
      async findTools() { return { tools: [{ name: "research/report", summary: "Stock research" }] }; },
      async describeTool() { return { name: "research/report", description, cost: 1, params: { properties: { query: { type: "string" } }, required: ["query"] } }; },
      async executeTool() { assert.fail("Described write operation must not execute"); },
    };
    const result = await gatherAgentKeyResearch("Get NVIDIA stock research", client, "NVDA");
    assert.equal(result.state, "unsupported");
  }
});

test("multi-block MCP descriptions retain documented read-only params", async () => {
  const client = {
    async findTools() { return { tools: [{ name: "yfinance/getChart", summary: "Stock chart" }] }; },
    async describeTool() { return { content: [
      { type: "text", text: "Read-only stock chart metadata" },
      { type: "text", text: JSON.stringify({ name: "yfinance/getChart", cost: { credits_per_call: 1 }, params: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }) },
    ] }; },
    async executeTool(_name, params) { assert.deepEqual(params, { symbol: "NVDA" }); return { chart: [] }; },
  };
  const result = await gatherAgentKeyResearch("Get Yahoo Finance chart for NVIDIA", client, "NVDA");
  assert.equal(result.state, "used");
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

test("symbol tools require a resolved or explicit ticker instead of guessing an uppercase word", async () => {
  let executions = 0;
  const client = {
    async findTools() { return { tools: [{ name: "yfinance/getChart", summary: "Read Yahoo Finance stock price history" }] }; },
    async describeTool() { return { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }; },
    async executeTool() { executions++; return { chart: { close: [100] } }; },
  };
  const result = await gatherAgentKeyResearch("I want Yahoo Finance price history for Costco.", client);
  assert.equal(result.state, "unsupported");
  assert.deepEqual(result.tools, []);
  assert.equal(executions, 0);
});

test("optional tools with incompatible array parameter schemas are skipped", async () => {
  const executions = [];
  const client = {
    async findTools() { return { tools: [{ name: "news/search", summary: "Search financial news" }, { name: "finance/getQuote", summary: "Read current stock quote" }] }; },
    async describeTool(name) {
      return name === "news/search"
        ? { cost: 1, inputSchema: { properties: { keywords: { type: "array", items: { type: "number" } } }, required: ["keywords"] } }
        : { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } };
    },
    async executeTool(name, params) { executions.push([name, params]); return { quote: { symbol: "NVDA" } }; },
  };
  const result = await gatherAgentKeyResearch("Get NVIDIA news and price", client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(executions, [["finance/getQuote", { symbol: "NVDA" }]]);
});

test("query values adapt to declared arrays of strings", async () => {
  const executions = [];
  const client = {
    async findTools() { return { tools: [{ name: "news/search", summary: "Search financial news" }] }; },
    async describeTool() { return { cost: 1, inputSchema: { properties: { keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 } }, required: ["keywords"] } }; },
    async executeTool(name, params) { executions.push(params); return { results: [] }; },
  };
  const query = "Find NVIDIA earnings news";
  const result = await gatherAgentKeyResearch(query, client);
  assert.equal(result.state, "used");
  assert.deepEqual(executions, [{ keywords: [query] }]);
});

test("output schemas and examples cannot stand in for an execution input schema", async () => {
  let executions = 0;
  const client = {
    async findTools() { return { tools: [{ name: "finance/getQuote", summary: "Read current stock quote" }] }; },
    async describeTool() { return { cost: 1, outputSchema: { properties: { price: { type: "number" } } }, examples: [{ inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }] }; },
    async executeTool() { executions++; return { price: 100 }; },
  };
  const result = await gatherAgentKeyResearch("Get NVIDIA stock price", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.equal(executions, 0);
});

test("bounded synthesis context preserves each executed provider's data", async () => {
  const longArticles = Array.from({ length: 20 }, (_, index) => ({ title: `NVIDIA article ${index}`, snippet: "NVIDIA earnings coverage ".repeat(20), url: `https://news.example/${index}` }));
  const client = {
    async findTools() { return catalog; },
    async describeTool(name) { return name === "GoogleNews/search" ? { cost: 1, inputSchema: { properties: { query: { type: "string" } }, required: ["query"] } } : { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }; },
    async executeTool(name) { return name === "GoogleNews/search" ? { results: longArticles } : { chart: { close: [190, 194] } }; },
  };
  const result = await gatherAgentKeyResearch(query, client, "NVDA");
  assert.equal(result.state, "used");
  assert.equal(result.tools.length, 2);
  assert.ok(result.context.length <= 8_000);
  assert.match(result.context, /yfinance\/getChart/);
  assert.match(result.context, /194/);
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

test("structuredContent takes precedence over MCP display text and retains article sources", async () => {
  const article = { title: "NVIDIA historical trading after earnings", url: "https://news.example/nvda-history", publisher: "News Desk", publishedAt: new Date().toISOString(), snippet: "NVIDIA share reaction." };
  const payload = { chart: { close: [100, 102] }, results: [article] };
  const client = {
    async findTools() { return { tools: [{ name: "yfinance/getChart", summary: "Read Yahoo Finance stock price history" }] }; },
    async describeTool() { return { cost: 1, inputSchema: { properties: { symbol: { type: "string" } }, required: ["symbol"] } }; },
    async executeTool() { return { content: [{ type: "text", text: "Retrieved two historical prices." }], structuredContent: payload }; },
  };
  const result = await gatherAgentKeyResearch("Get Yahoo Finance chart for NVIDIA", client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools[0].data, payload);
  assert.deepEqual(result.sources.map(source => source.url), [article.url]);
});

test("plain text catalog discovery recognizes the legacy AgentKey search name", () => {
  assert.deepEqual(agentKeyResearchCandidates({ content: [{ type: "text", text: "agentkey_search — Search public news" }] }).map(item => item.name), ["agentkey_search"]);
});

test("generic AgentKey news search does not impersonate requested providers", async () => {
  const calls = [];
  const client = {
    async findTools(query) {
      calls.push(["find", query]);
      return { tools: [{ name: "agentkey_search", summary: "Search public news" }] };
    },
    async describeTool(name) {
      calls.push(["describe", name]);
      return { name, cost: 1, inputSchema: { properties: { query: { type: "string" }, type: { type: "string", enum: ["news"] } }, required: ["query", "type"] } };
    },
    async executeTool(name, params) {
      calls.push(["execute", name, params]);
      return { results: [] };
    },
  };
  const result = await gatherAgentKeyResearch("Use AgentKey to explain NVIDIA's stock reaction using Yahoo Finance and Google News", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.equal(result.reason, "requested-provider-missing");
  assert.equal(calls.some(([method]) => method === "execute"), false);
});

test("scoped discovery finds the requested Google News and Yahoo Finance tools", async () => {
  const calls = [];
  const client = {
    async findTools(query, prefix) {
      calls.push(["find", query, prefix]);
      if (prefix === "search/serper") return { tools: [{ name: "Serper/news", summary: "News search" }] };
      if (prefix === "finance/yfinance") return { tools: [{ name: "yfinance/getChart", summary: "Stock price history" }] };
      return { tools: [{ name: "Brave/getNewsSearch", summary: "News search" }] };
    },
    async describeTool(name) {
      calls.push(["describe", name]);
      return { name, cost: { credits_per_call: 1 }, params: name === "Serper/news"
        ? { type: "object", properties: { q: { type: "string" } }, required: ["q"] }
        : { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } };
    },
    async executeTool(name, params) { calls.push(["execute", name, params]); return { results: [] }; },
  };
  const result = await gatherAgentKeyResearch("Use AgentKey research with Yahoo Finance and Google News", client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools.map(tool => tool.name), ["Serper/news", "yfinance/getChart"]);
  assert.deepEqual(calls.filter(([method]) => method === "find").map(([, , prefix]) => prefix), [undefined, "search/serper", "finance/yfinance"]);
  assert.deepEqual(calls.filter(([method]) => method === "execute").map(([, name]) => name), ["Serper/news", "yfinance/getChart"]);
});

test("a different news provider cannot claim Google News through its summary", async () => {
  const client = {
    async findTools() { return { tools: [{ name: "Brave/getNewsSearch", summary: "Alternative to Google News" }] }; },
    async describeTool() { assert.fail("Wrong provider must not be described"); },
    async executeTool() { assert.fail("Wrong provider must not execute"); },
  };
  const result = await gatherAgentKeyResearch("Use Google News for NVDA earnings", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.equal(result.reason, "requested-provider-missing");
});

test("a rejected catalog candidate can fall through to another tool from the requested provider", async () => {
  const calls = [];
  const client = {
    async findTools(_query, prefix) {
      calls.push(["find", prefix]);
      if (prefix === "search/serper") return { tools: [{ name: "Serper/news", summary: "Google News" }] };
      return { tools: [{ name: "Serper/badNews", summary: "Google News" }, { name: "yfinance/getChart", summary: "Stock chart" }] };
    },
    async describeTool(name) {
      calls.push(["describe", name]);
      if (name === "Serper/badNews") return { cost: { credits_minimum: 1, metered: true }, params: { properties: { q: { type: "string" } }, required: ["q"] } };
      return { cost: { credits_per_call: 1 }, params: name === "Serper/news"
        ? { properties: { q: { type: "string" } }, required: ["q"] }
        : { properties: { symbol: { type: "string" } }, required: ["symbol"] } };
    },
    async executeTool(name, params) { calls.push(["execute", name, params]); return { results: [] }; },
  };
  const result = await gatherAgentKeyResearch(query, client, "NVDA");
  assert.equal(result.state, "used");
  assert.deepEqual(result.tools.map(tool => tool.name), ["Serper/news", "yfinance/getChart"]);
  assert.deepEqual(calls.filter(([kind]) => kind === "execute").map(([, name]) => name), ["Serper/news", "yfinance/getChart"]);
});

test("unsupported provider discovery includes a safe diagnostic reason", async () => {
  const client = { findTools: async () => ({ tools: [] }), describeTool: async () => ({}), executeTool: async () => ({}) };
  const result = await gatherAgentKeyResearch("Use Yahoo Finance and Google News", client, "NVDA");
  assert.equal(result.state, "unsupported");
  assert.equal(result.reason, "requested-provider-missing");
});

test("unavailable AgentKey connections return a safe status", async () => {
  const result = await gatherAgentKeyResearch(query, { findTools: async () => { throw new Error("secret upstream response"); }, describeTool: async () => ({}), executeTool: async () => ({}) });
  assert.equal(result.state, "unavailable");
  assert.doesNotMatch(JSON.stringify(result), /secret upstream response/);
});
