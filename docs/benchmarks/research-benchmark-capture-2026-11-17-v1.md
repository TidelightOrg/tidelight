# Research benchmark capture · 17 November 2026 · v1

**Status:** Ten production API captures complete. Claim review and scoring are pending.
**Interface:** public Judge Mode Agent Flow, HTTP server-sent events.  
**Capture window:** 2026-11-17 16:41 UTC through 2026-11-18 17:14 UTC.
**Planned set:** ten dated events across at least three issuer or macro categories.

The separate capture avoids changing the frozen 24 October event set. All ten production requests returned HTTP 200 and a final result event. Events 1–8 ran on 17 November, followed by events 10 and 9 on 18 November. Exact raw SSE files, including the exact final `result` event, are stored locally at `.local/research-benchmarks/2026-11-17-v1/`. That path is git-ignored because responses contain current market data and provider redistribution rights have not been confirmed. The files are not committed or published.

| ID | Category and topic | Listed sources | URL domains / coverage domains | Synthesis | Capture date and time (UTC) |
| --- | --- | ---: | ---: | --- | --- |
| `event-01-employment` | US macro · October 2026 Employment Situation | 2 | 1 / 2 | Source-only | 17 Nov 16:41–16:45 |
| `event-02-cpi` | US macro · October 2026 CPI | 13 | 1 / 4 | Source-only | 17 Nov 16:41–16:45 |
| `event-03-apple-q4` | Issuer earnings · Apple fiscal 2026 Q4 | 4 | 2 / 1 | Model synthesis | 17 Nov 16:41–16:45 |
| `event-04-fomc` | US macro · FOMC decision | 15 | 1 / 4 | Source-only | 17 Nov 17:46 |
| `event-05-tesla-q3` | Issuer earnings · Tesla Q3 2026 | 30 | 2 / 1 | Source-only | 17 Nov 17:46 |
| `event-06-alphabet-q3` | Issuer earnings · Alphabet Q3 2026 | 30 | 2 / 1 | Source-only | 17 Nov 17:47 |
| `event-07-amazon-q3` | Issuer earnings · Amazon Q3 2026 | 29 | 2 / 1 | Source-only | 17 Nov 18:48 |
| `event-08-microsoft-q1` | Issuer earnings · Microsoft FY27 Q1 | 29 | 2 / 1 | Model synthesis | 17 Nov 18:49 |
| `event-09-meta-q3` | Issuer earnings · Meta Q3 2026 | 30 | 2 / 1 | Source-only | 18 Nov 17:14 |
| `event-10-nvidia-latest-earnings-agentkey` | Issuer earnings · NVIDIA FY27 Q3 | 30 | 2 / 1 | Source-only | 18 Nov 17:13 |

“URL domains” are calculated from the returned source URLs. “Coverage domains” is the API’s separate coverage metadata; discrepancies are recorded without treating either value as an answer-quality judgment. The first two runs have no model synthesis. The Apple run cites SEC facts for a period ended 27 June 2026 while answering a Q4 question; source/period fit and all output claims still require independent review. No source relevance or publisher independence has been adjudicated.

Each SSE file is verified locally by SHA-256:

- `event-01-employment.sse` — `d8b2bf935e865ac40a55a2a21b170877b29c4b2598620da7f5bdfaa88cfa3eb5`
- `event-02-cpi.sse` — `46a5af3c4f2bd98bbf6a496c6f8ee956f748547d8147b22ff379d1e8dfaa9b18`
- `event-03-apple-q4.sse` — `74b10ca9a6856f1cbe062b43f65f1d33b7dfaedbe5c4033fe6c74716ab62b174`
- `event-04-fomc.sse` — `9bb8cdf585e46e10f870796f6ae285ef99cfd5294ed1927de782983378619868`
- `event-05-tesla-q3.sse` — `3b2a197dbec319cd8ac897acd908d5e5b23de9b0c58c0c715bc43d64ba2054cf`
- `event-06-alphabet-q3.sse` — `f90af76fb7eb5f79f37e971a65a857686f077989fda591f1b7be79eb9c1075f7`
- `event-07-amazon-q3.sse` — `3b41cd274a995115e554fa9822fbd3e3b3a65d9d0f4649047144fdacb84bb30f`
- `event-08-microsoft-q1.sse` — `2eeae380a2ea4fdb1bbbd602bd6efebd12c0bcf6e05420ee32d7cc706f9a2b65`

- `event-09-meta-q3.sse` — `fe9afeb1c2bcd826ddcd94265f7a7266e39de4f0604f3581a2185b82776d2b92`
- `event-10-nvidia-latest-earnings-agentkey.sse` — `bc36200400c25d01e596324da33ebe4d094bb4bfa3b9c74f0ea130159b9c1fb3`

## Evaluation boundary

These are exact API event-stream captures, not captures of the rendered UI text. UI task time was not measured. Eight runs returned sources without model synthesis, and two returned model synthesis. The Apple run has candidate claims in its API payload, but claim extraction, exact claim-source passage capture, two independent labels, and adjudication are outstanding. No claim-quality metric may be calculated from these API captures alone.

The public guest endpoint permits three requests per hour and ten per rolling day per connection. The 17 November batch was interrupted during the Meta request. Both outstanding captures were completed after the daily window reset.

The exact NVIDIA AgentKey prompt ran after NVIDIA published its FY27 Q3 results. Agent Flow's trace reported `unsupported (no-usable-schema)`. Zero AgentKey tools executed. The result used SEC data and public news feeds. Its source-only fallback followed a Qwen timeout and two Gemini HTTP 503 responses.

Reviewers still need the rendered text, source passages, and two independent labels per claim followed by adjudication. Confirm provider permissions before sharing any capture containing market data. The frozen 24 October packet and its scorer result remain separate.
