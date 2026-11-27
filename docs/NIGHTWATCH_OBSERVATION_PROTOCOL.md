# Nightwatch supervised observation protocol

**Protocol:** `nightwatch-observation-v1`  
**Status:** Applies only to observation windows started after this protocol, provider provenance, and the associated failure-handling change are deployed to production.

## Gate

Complete at least **90 consecutive calendar days and 100 eligible decisions**, whichever takes longer. Eligible decisions must cover ordinary and stressed market conditions identified before the window starts. If the required stress conditions do not occur, the gate remains open. The 100-decision floor is an operational minimum, not a claim of statistical power or predictive accuracy.

Do not backdate the start or count historical scheduled executions toward this gate. The 162 executions in the 27 November 2026 aggregate predate this protocol and include records whose analysis validity cannot be proven from the saved fields.

## Preregister each observation window

Before the first scheduled run, record in the private operator log:

- The UTC start time, production deployment SHA, and protocol version.
- The owner-authorized schedule cohort, each schedule's captured revision, instrument, playbook, and a digest of its fixed configuration.
- The `nightwatch-agent-v1` decision contract, the allowed upstream provider/model pairs, and the active risk limits.
- An independently reviewed rule for identifying ordinary and stressed conditions. Freeze the rule before observing outcomes; do not invent a stress threshold after seeing results.
- The daily reconciliation query/report location and the person responsible for investigating discrepancies.

Do not put account IDs, balances, provider credentials, or private research content in the public report. Keep owner-level reconciliation in the restricted operational record and publish only approved aggregates.

## Count one eligible decision

The unit is one distinct `nightwatch_runs.id`, not one schedule execution. Count it only when all of these checks pass:

1. At least one linked `nightwatch_schedule_executions` row is `complete`, has a run ID, and was created on or after the preregistered start.
2. The execution owner matches the run owner and the run's account owner. Its captured `config.revision` matches `schedule_revision`; its captured schedule ID and symbol match the execution and run. A schedule deleted after completion may have a null foreign key; use the immutable captured config for that historical link.
3. The run snapshot has `trigger = custom_schedule`, the matching `scheduleExecutionId`, the expected captured `scheduledFor`, Bitget public 4-hour candle metadata, and a `closedCandleEnd` equal to the run's `as_of`. The database freshness gate must have accepted the candle at decision time.
4. The captured playbook matches the preregistered configuration. The snapshot contains a successfully validated `nightwatch-agent-v1` result with an allowed action and signal, finite confidence from 0 through 1, a non-empty rationale, and an `analysisProvider` whose name/model pair is on the preregistered allowlist. A missing result, malformed result, unexpected provider/model, or provider failure is not a decision.
5. The terminal outcome is `executed`, `no_action`, or `rejected`. A valid model proposal rejected by a deterministic risk guard still counts: it is a completed decision and must remain visible in the outcome mix.

Count a run ID once even if retries or multiple schedules reference it. Never count `running`, `skipped`, or `failed` executions, provider/data failures, paused checks without a validated model result, stale candles, duplicate links, or records with an owner, revision, instrument, timestamp, or snapshot mismatch. Keep all such attempts in the operational denominator and failure report; exclusion from the eligible-decision count must not hide them.

## Reconcile daily

For each cohort, retain totals for scheduled attempts, retries, completed runs, distinct eligible run IDs, each outcome, provider/model, and every exclusion reason. Reconcile every `executed` run to exactly one same-owner `nightwatch_orders` record with `paper_only = true`; confirm `no_action` and `rejected` runs have no order. Investigate duplicate, missing, cross-owner, non-paper, or unexplained records before continuing the gate. Do not inspect or report account balances for this aggregate check.

Record the number of active observation days and days in each preregistered market condition. Any change to the deployed decision logic, risk limits, instrument cohort, playbook, or captured schedule configuration starts a new window for the affected cohort. Preserve the prior window and its failures in the audit record; do not combine its counts with the new version.

## Close the gate

Close only after the date and decision-count floors, ordinary/stressed coverage, daily reconciliation, and exit checks all pass. The exit checks require zero unexplained fills, duplicate paper actions, cross-owner records, non-paper orders, and guardrail bypasses. Report the exact window, deployment and configuration versions, denominator, outcomes, exclusions, and unresolved limitations. Paper results remain simulations and do not establish future performance or exchange outcomes.
