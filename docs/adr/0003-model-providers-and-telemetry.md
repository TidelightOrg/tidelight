# ADR 0003: Model providers fail open to the next provider, and telemetry stays content-free

## Status

Accepted

## Context

Synthesis runs inside a fixed route budget. Provider failures, thought summaries, and health telemetry must not change the research result or retain the prompt.

## Decision

- Reuse the authenticated, atomic two-per-hour provider diagnostic budget. (`app/api/system/agentkey-check/route.ts`)
- Check a discovered read-only capability and its price without a billable data query. (`app/api/system/agentkey-check/route.ts`)
- Run bounded, read-only AgentKey research through the project's Tidelight credential. (`app/api/v1/research/agentkey/route.ts`)
- One bounded AgentKey discovery pass, retaining bounded tool data for synthesis and attributable headlines for citations. (`lib/agentkey-flow-sources.ts`)
- Pass the research question through as-is. The search adapter already narrows the user-facing instruction into a provider query; appending format guidance here adds noise after that instruction and can prevent its cleanup from removing the trailing provider names. (`lib/agentkey-flow-sources.ts`)
- MCP results commonly wrap their JSON payload in one or more text content blocks. (`lib/agentkey-research.ts`)
- Check the operation name with the strict action list. Free-text descriptions of market data routinely mention open/close prices and buy/sell ratings. (`lib/agentkey-research.ts`)
- Metered prices are minimums, so they cannot establish the per-call cap. (`lib/agentkey-research.ts`)
- AgentKey documents `params` as the input schema and `execute_as.params` as an example call. (`lib/agentkey-research.ts`)
- Field names only: enough to diagnose an unfamiliar provider wrapper without logging article content. (`lib/agentkey-research.ts`)
- Serper news dates are often relative to retrieval (for example, "3 hours ago"). Keep only bounded ages that cannot cross the 30-day issuer evidence window. (`lib/agentkey-research.ts`)
- AgentKey is an optional Chainbase data source, not a Bitget order gateway. Keep its master key on the server: a browser caller must never choose a tool name or send arbitrary parameters directly to this client. (`lib/agentkey.ts`)
- Ignore non-JSON keepalives. (`lib/agentkey.ts`)
- Discover live catalog names using the user's full natural-language intent. (`lib/agentkey.ts`)
- Fetch the current schema and cost before executing a discovered tool. (`lib/agentkey.ts`)
- Call only a tool whose name and params were checked against describeTool. (`lib/agentkey.ts`)
- Total time across all providers and retries, including response bodies. (`lib/ai-fallback.ts`)
- Absolute route deadline, so work done before AI also consumes the budget. (`lib/ai-fallback.ts`)
- Enables the short, shared provider circuit derived from minimized health events. (`lib/ai-fallback.ts`)
- Sanitized provider-call telemetry. Callback errors never affect research. (`lib/ai-fallback.ts`)
- Telemetry must not change the research result. (`lib/ai-fallback.ts`)
- Thought summaries are not the final JSON answer. Blocked candidates must not become trading assessments, even if they contain plausible JSON. (`lib/ai-fallback.ts`)
- Routing telemetry cannot change the research result. (`lib/ai-fallback.ts`)
- Give the primary Qwen model time to complete a full evidence prompt, while preserving at least 22 seconds for native Gemini on the 38-second Agent Flow budget. Retries share the same window. (`lib/ai-fallback.ts`)
- Race the whole operation, not just headers: a stalled JSON body must yield to the fallback before the route's absolute deadline. (`lib/ai-fallback.ts`)
- Gemini 3 expects lowercase REST thinking levels. Flash-Lite defaults to minimal; other Gemini 3 models use low for a bounded research request. Google recommends default sampling. (`lib/ai-fallback.ts`)
- Provider error bodies can echo research prompts or source text. Do not parse, retain, or log that untrusted response content. (`lib/ai-fallback.ts`)
- Only shape and finish metadata are logged; supplied evidence and provider output may contain private research questions. (`lib/ai-fallback.ts`)
- Retry one schema-invalid response within the same provider and route deadline. (`lib/ai-fallback.ts`)
- A timed-out provider should yield to the next provider immediately. (`lib/ai-fallback.ts`)
- Provider error bodies are untrusted and may echo research content; retain no body fields. (`lib/ai-fallback.ts`)
- Release an untrusted error stream without reading or buffering its contents. (`lib/ai-fallback.ts`)
- cancellation must not mask the provider status (`lib/ai-fallback.ts`)
- Abort asks the transport to stop; racing a deadline also bounds callers when an adapter ignores the signal or never settles. (`lib/provider-health.ts`)
- Apply only a short circuit from recent operational events; this never labels a provider healthy. (`lib/provider-health.ts`)
- If every configured provider appears impaired, retain the ordinary bounded Qwen→Gemini fallback as a half-open recovery probe instead of hard-failing. (`lib/provider-health.ts`)
- Read a small, recent metadata window. On telemetry failure, callers keep the configured provider order. (`lib/provider-health.ts`)
- Persist at most six metadata-only attempts; abort the write after 1.5 seconds to protect research saves. (`lib/provider-health.ts`)
- Operations telemetry must never prevent a user's research result from saving. (`lib/provider-health.ts`)
- Next's server-only marker guards client bundles. This Node test process is a server context; substitute only that marker while importing the actual helper. (`tests/ai-fallback.test.mjs`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
