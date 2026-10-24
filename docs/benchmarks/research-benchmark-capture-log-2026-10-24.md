# Frozen research benchmark capture log

This log supplements the frozen ten-event source set. It records the eight live production runs captured on 24 October 2026 in Codex Cloud with GPT-5.6 Luna Light, the lowest available model. The captured run outputs were inspected in the session. Durations are elapsed times shown by the research UI. This is a partial operational capture, not a scored benchmark or a substitute for the two independent claim reviewers required by the protocol.

| Event | Elapsed | Observed output |
| --- | ---: | --- |
| NVIDIA FY2026 Q4 | 29 s | Gemini synthesis. Reported a 75% data-center revenue increase, but the visible output was headline/context level; it did not provide source-linked counter-evidence points or a trade handoff. Quote freshness was available. |
| Apple FY2026 Q1 | 42 s | Source-only fallback with three public headlines. The most recent listed item concerned Q1 FY2026 results; no AI analysis was produced. A prior paraphrased run surfaced Q2 coverage, so the exact frozen question was rerun and retained. |
| Microsoft FY2026 Q2 | 30 s | Gemini synthesis. Output included claims about a $678B backlog up 84% and institutional fund sales, with no counter-evidence. The quote was stale. A prior paraphrased run returned FY Q4 coverage, so the exact frozen question was rerun and retained. |
| Amazon FY2025 Q4 | 3 s | No attributable sources returned; no synthesis. |
| Tesla FY2025 Q4 | 32 s | Source-only fallback with 15 headlines across 11 publishers; AI synthesis unavailable. |
| Alphabet FY2025 Q4 | 12 s | Qwen response based on one headline. The model reported no usable results and 10% confidence; no trade handoff. |
| Federal Reserve January 2026 decision | 34 s | Eighteen macro sources collected. AI synthesis unavailable; output remained source-only without a factual summary. |
| U.S. August 2026 CPI | 40 s | Ten macro sources collected. AI synthesis unavailable; output remained source-only. |
| September 2026 labor market | 42 s UI | Captured on production: 7 macro sources; source-only brief, AI synthesis unavailable, confidence 0%, no verified macro conclusion or handoff. Four steps. Exact task time not measured. |
| September 2026 CPI | 41 s UI | Captured on production: 15 macro sources; source-only brief, AI synthesis unavailable, confidence 0%, no verified macro conclusion or handoff. Four steps. Source list included off-topic regional, PPI, Canada, and India results; relevance is unadjudicated. |

## Interpretation boundary

All ten rows now have observed production outputs. The final two were rerun after the hourly limit cleared; their results are actual source-only outputs, not imputed values. Exact browser start timestamps and saved-note completion times were not captured for any run, so elapsed UI durations are not treated as protocol task-time measurements. The human claim labels, source-fit labels, counter-evidence judgments and adjudications have not been performed; therefore the benchmark scorer must continue to report an incomplete gate and no benchmark score.

The observed failures include missing or single-source coverage, source-only output when synthesis was unavailable, stale or questionable claims, and absent counter-evidence. These are qualitative findings from the captured outputs. No aggregate rate is calculated without the required claim-level review.
