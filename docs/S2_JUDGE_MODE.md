# Tidelight S2 public judge mode

## Canonical route

- Public evaluator: https://tidelight.app/judge
- Live research path: https://tidelight.app/flow?demo=1

## Intended five-minute review

1. Open `/judge` without an account.
2. Review the evidence-first trust spine.
3. Open the evaluator research path with the prefilled after-hours question.
4. Open one of the owner-published replay cards on `/judge`; inspect the source lineage, token quote freshness, missing market measurements, and gate result.
5. Download that replay's sanitized JSON from its page or the separate collapsible data-artifacts section in the repository README.
6. Open Strategy Lab and Nightwatch to inspect the two supporting modes.

## Evidence boundary

The judge route is a product walkthrough and evaluator index. It does not fabricate live performance, paper fills, or audited alpha. Any live result must come from the authenticated research workflow and its stored evidence.

## Submission narrative

Primary entry: AI Trading Desk — an after-hours intelligence desk for Bitget tokenized US equities.

One sentence: **Tidelight turns overnight tokenized-stock events into source-verified research, exposure-aware scenarios and risk-gated paper decisions.**

## Verification checklist

- [ ] Public route returns without login.
- [ ] Authenticated research flow completes with a valid account.
- [ ] Evidence source links and timestamps are visible.
- [ ] Counter-evidence and gate reasons are visible.
- [ ] Strategy report includes data window, OOS window, costs and raw trades.
- [ ] Nightwatch run includes decision, risk result and paper outcome.
- [ ] Authentication regression suite remains green.

## Live owner-published examples

The Judge page and repository README list five additional token reviews alongside the original rNVDA and NVDA/TSLA examples. The five new runs cover rTSLA, rMSFT, rAAPL, rGOOGL, and rAMZN. All five collected issuer headlines but reported that AI synthesis was unavailable; they must be presented as transparent fallback records, not completed analyst theses or directional recommendations. Their published links expire after 30 days and can be revoked by the owner.



## Codex MCP connection record

The public Judge page includes the Codex MCP status record at [`/judge#codex-mcp-evidence`](https://tidelight.app/judge#codex-mcp-evidence), with its machine-readable artifact at [`/evidence/tidelight-codex-mcp.json`](https://tidelight.app/evidence/tidelight-codex-mcp.json). The Tidelight Research custom plugin is registered in Codex and points to the official Streamable HTTP endpoint. The user approved the read-only `market:read` OAuth scope. The active grant appears in Tidelight's developer console. A read-only call through the connected plugin returned 100 supported instruments (the response limit) with request ID `6efee181-ed3b-49bb-a1fb-2a1d3f0ac0ff`. This verifies one market read path only; it does not test the research job scope or other MCP tools.
