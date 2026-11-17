# Research benchmark capture · 17 November 2026 · v1

**Status:** capture in progress; not frozen and not scored.  
**Interface:** public Judge Mode Agent Flow, HTTP server-sent events.  
**Capture window:** 2026-11-17 16:41–16:45 UTC.  
**Planned set:** ten dated events across at least three issuer or macro categories.

The separate capture avoids changing the frozen 24 October event set. It currently contains three production runs. Exact raw SSE files, including the exact final `result` event, are stored locally at `.local/research-benchmarks/2026-11-17-v1/`. That path is git-ignored because one response contains a current market quote and candles, and provider redistribution rights have not been confirmed. The files are not committed or published.

| ID | Category | Question topic | Sources returned | Synthesis | Observation |
| --- | --- | --- | ---: | --- | --- |
| `event-01-employment` | US macro · employment | October 2026 Employment Situation | 2 | Source-only | One official BLS result and one independent report were returned. Provider synthesis failed; no market conclusion or handoff was produced. |
| `event-02-cpi` | US macro · inflation | October 2026 CPI | 13 | Source-only | Four publisher domains were reported. The returned list included regional and non-US inflation results; source relevance is not adjudicated. Provider synthesis failed. |
| `event-03-apple-q4` | Issuer earnings · consumer technology | Apple fiscal 2026 Q4 | 4 listed; coverage reported 3 | Gemini synthesis | The summary cites SEC facts for a period ended 27 June 2026 while answering a Q4 question. Coverage metadata reports one source domain despite three publishers. Source/period fit and output claims need independent review. |

Each SSE file is verified locally by SHA-256:

- `event-01-employment.sse` — `d8b2bf935e865ac40a55a2a21b170877b29c4b2598620da7f5bdfaa88cfa3eb5`
- `event-02-cpi.sse` — `46a5af3c4f2bd98bbf6a496c6f8ee956f748547d8147b22ff379d1e8dfaa9b18`
- `event-03-apple-q4.sse` — `74b10ca9a6856f1cbe062b43f65f1d33b7dfaedbe5c4033fe6c74716ab62b174`

## Evaluation boundary

These are exact API event-stream captures, not captures of the rendered UI text. UI task time was not measured. The first two runs contain no source-bound analyst synthesis claims and cannot stand in for reviewed factual answers. The Apple run has candidate claims in its API payload, but claim extraction, exact claim-source passage capture, two independent labels, and adjudication are outstanding. No claim-quality metric may be calculated from this partial set.

The public guest endpoint permits at most three requests per hour and ten per day per connection. Three requests were used for these captures; continue within the published limit. Do not rotate egress to bypass it. Before reviewers receive any output containing provider market data, confirm the permitted storage and sharing scope. Keep the frozen 24 October packet and its scorer result unchanged.
