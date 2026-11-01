# Research evidence graph v1

Agent Flow attaches a versioned `evidenceGraph` to the existing Research result and private `research_runs.summary`. It is built from the bounded sources, validated supporting and counter-evidence points, issuer or macro subject, instrument snapshots, and the assessment already produced by the route. Existing `researchRunId` handoffs remain the lineage key; no new table or migration is required.

Nodes currently represent the research event, issuer or macro subject, research hypothesis, citation-backed claim, captured source, retrieved excerpt, and Reality tokenized-spot or U.S. stock-perpetual observation. Edges record subject, exposure, support/challenge, citation, and excerpt relationships. IDs are deterministic SHA-256-derived references for graph joins and replay comparison; they are not an integrity signature or proof that a claim is true.

The graph records its `asOf` snapshot time separately from source publication and market observation timestamps. Sources published after the snapshot are omitted, and market prices without an observation timestamp at or before the snapshot are suppressed. Date-only publication values remain date-only and are eligible only when the full publication day precedes the snapshot day; same-day values are excluded because their time is unknown. Claims that cite only omitted future sources are not included. Undated citations remain explicitly labeled. Source linkage means the URL appeared in the bounded evidence set; it does not establish semantic support. Retrieved excerpts are labeled as excerpts and are not represented as quote-verified.

The existing public replay endpoint continues to serialize its own explicit allowlist. It does not publish `evidenceGraph` or its captured excerpts implicitly. A later public capsule contract must separately define redaction, consent, outcome revisions, and verifiable integrity.

## Acceptance checks

- IDs and graph serialization reproduce for the same input snapshot.
- A claim can be inspected with its cited source and available captured excerpt.
- Supporting and contrary claims remain distinct.
- Future-dated sources and future market observations do not enter historical snapshots.
- Source-only fallbacks are not labeled as model confidence.
- Public research replay remains restricted to its existing allowlisted fields.
