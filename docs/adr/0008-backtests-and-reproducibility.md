# ADR 0008: Backtests are reproducible from archived candles and an untouched holdout

## Status

Accepted

## Context

A saved run is evidence only when its manifest, dataset fingerprint, and holdout are the same ones that produced the stored metrics. Selection does not look at the holdout.

## Decision

- Run a server-authenticated backtest and persist its reproducibility manifest. (`app/api/strategies/backtest/route.ts`)
- Publish an owner-scoped replay only after validating its archived dataset and manifest. (`app/api/strategy-replays/route.ts`)
- The handbook calls out an OOS Sharpe below half the in-sample Sharpe. (`lib/alpha-generalization.ts`)
- A basket comparison is causal only when all markets share one holdout window. (`lib/alpha-matrix.ts`)
- Convert candles into the stable OHLCV field order used by dataset fingerprints. (`lib/backtest-manifest.ts`)
- Serialize plain JSON values with sorted object keys for reproducible digests. (`lib/backtest-manifest.ts`)
- Return the SHA-256 fingerprint for an ordered set of archived OHLCV candles. (`lib/backtest-manifest.ts`)
- Capture provider-returned market context alongside the private run, without expanding the public replay manifest. (`lib/backtest-manifest.ts`)
- Validate the bounded private observation snapshot and its canonical digest before rendering it. (`lib/backtest-manifest.ts`)
- Hash the manifest fields that precede its integrity record. (`lib/backtest-manifest.ts`)
- Capture the strategy, market, holdout split, costs, and dataset provenance for one run. (`lib/backtest-manifest.ts`)
- Verify candle validity, dataset identity, manifest assumptions, and digest before replay publication. (`lib/backtest-manifest.ts`)
- Confirm a verified manifest still describes the persisted run row and its execution assumptions. (`lib/backtest-manifest.ts`)
- Compare archived metrics with a fresh calculation from the same saved candles. (`lib/backtest-result-integrity.ts`)
- Bitget currently serves about 90 days of 4H candles. A 66/34 split leaves enough room for a 30-day OOS window while preserving 30+ days of evaluated training data after the 50-candle warm-up. (`lib/backtest.ts`)
- A truthful, machine-readable summary of whether this run is useful evidence. This deliberately compares only the untouched holdout with its same-window buy-and-hold baseline; it is not a claim of future performance. (`lib/backtest.ts`)
- Return the exact validated data set eligible for a historical replay. (`lib/backtest.ts`)
- Signals are decided from completed candles only and become effective on the next bar. (`lib/backtest.ts`)
- Three disjoint trailing evaluation windows, each using only earlier candles to warm the rule. (`lib/backtest.ts`)
- Stress the same fixed holdout under higher execution-cost assumptions. (`lib/backtest.ts`)
- Deterministic random long/cash placebo. Entry and exit hazards are estimated only from the strategy's training-window conditional state transitions, then applied to the untouched holdout with identical fee and slippage assumptions. (`lib/backtest.ts`)
- An unobserved prior state has no estimated transitions; keep its hazard at zero. (`lib/backtest.ts`)
- measure() uses signal[i - 1] at candle i's open, so set the signal immediately before the first holdout candle from training-only rates. (`lib/backtest.ts`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
