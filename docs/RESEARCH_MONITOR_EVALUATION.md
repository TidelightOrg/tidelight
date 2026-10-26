# Research quality evaluation

The methodology and scorer in RESEARCH_EVALUATION_PROTOCOL.md define a frozen event set, independent reviewer labels, adjudication, and raw numerator/denominator reporting. They do not claim a completed benchmark.

## Product fields currently available

A research run retains linked sources, publisher labels, publication dates when available, source capture time, quote freshness, supporting and counter-evidence, model confidence, and gate reasons. Research Monitor preserves dated completed runs and thesis revisions, then compares consecutive outputs.

These fields aid inspection. They are not a scored claim-accuracy result. A link does not prove that its article supports a claim; two publisher names do not prove editorial independence; model confidence is not calibration.

## Fixed benchmark scorecard

For every frozen event, two reviewers independently label displayed claims for quote match, entailment, source fit, counter-evidence, and interpretation boundary. Resolve disagreements before aggregation. Publish raw counts and denominators:

| Measure | Report |
| --- | --- |
| Citation coverage | Factual claims with valid citations / all displayed factual claims |
| Unsupported claim rate | Unsupported or unestablished claims / all displayed factual claims |
| Quote fidelity | Claims with a matching captured quotation / factual claims |
| Counter-evidence coverage | Events showing material opposing evidence / events where reviewers found it |
| Source relevance | Citations about the correct issuer, period, and subject / citations reviewed |
| Freshness | Fresh, stale, undated, or inaccessible source records / all source records |
| Conclusion agreement | Events whose conclusion matches adjudicated evidence / completed events |
| Completion time | Median and range from opening a question to saving a reviewed note |

Report inaccessible sources and empty denominators explicitly; never turn them into a zero or a pass. Preserve failures and reviewer disagreement. Capture a baseline before changing a prompt or source behavior, change one behavior at a time, and replay the same cases.

## Release status

The protocol and scorer are present in the repository. The current project handoff says the frozen event set is awaiting independent labels. Do not advertise an accuracy percentage or benchmark pass until reviewers finish and adjudicate the set.
