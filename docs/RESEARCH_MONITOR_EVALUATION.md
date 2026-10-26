# Research quality evaluation

This page is a public-facing companion to `RESEARCH_EVALUATION_PROTOCOL.md`. The protocol defines the frozen event set, independent labels, adjudication, and raw numerator/denominator reporting. It does not claim that the benchmark has been completed.

## What the product currently exposes

A research run retains its cited source links, publisher labels, publication dates when available, retrieval time in the source record, captured quote freshness, support/counter-evidence lists, model confidence, and explicit gate reasons. Research Monitor preserves dated completed runs and thesis revisions, and shows output deltas between consecutive runs.

These fields are provenance and inspection aids. They are not a scored claim accuracy result. A link is not proof that the linked article supports a claim; two publisher names do not establish editorial independence; model confidence is not calibration.

## Fixed benchmark scorecard

For each frozen public event, reviewers independently label exact displayed claims for quote match, claim entailment, source fit, counter-evidence, and interpretation boundary. Resolve disagreements before aggregation. Publish counts and denominators with each rate:

| Measure | Publish |
| --- | --- |
| Citation coverage | supported factual claims with valid citations / all displayed factual claims |
| Unsupported claim rate | unsupported or unestablished claims / all displayed factual claims |
| Quote fidelity | displayed claims with a captured matching quotation / factual claims |
| Counter-evidence coverage | reviewed events showing material opposing evidence / events where reviewers found such evidence |
| Source relevance | claims whose cited source is about the right issuer, period, and subject / claims reviewed |
| Freshness | sources categorized fresh, stale, undated, or inaccessible at capture / all source records |
| Conclusion agreement | events where the conclusion matches the adjudicated evidence / completed events |
| Completion time | median and range from opening a question to saving the reviewed note |

Report uncaptured, inaccessible, and empty-denominator states as such; never convert them to zero or success. Preserve failures and reviewer disagreement. Make a prompt or source change only after recording a baseline on the frozen set, changing one behavior, then replaying the same cases.

## Release status

The protocol and scorer are present in the repository. The handoff documents the frozen capture set is awaiting independent labels. Until those labels and adjudications are complete, no research accuracy percentage or benchmark pass should be advertised.
