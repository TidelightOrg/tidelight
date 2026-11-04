# Private Decision Capsules (v1)

Decision Capsules preserve an immutable, private snapshot of a completed research run, persisted source lineage, and persisted claim/quote records. The capsule API is additive: it reads existing `research_runs`, `research_sources`, and `research_evidence` records and does not replace saved research or public replay links. If source or evidence rows exceed the bounded capture limits, the API refuses to create a potentially incomplete capsule.

## API

- `POST /api/decision-capsules` with `{ "researchRunId": "<uuid>" }` requires a signed-in user and snapshots only a completed run belonging to that user.
- Repeating the request for the same owner and run returns the existing capsule. The database enforces one capsule per owner/run.
- `GET /api/decision-capsules/<capsule-id>` requires the owning signed-in user. It recomputes the canonical SHA-256 over `original_snapshot` and returns the snapshot only when the digest matches.
- Add `?download=1` to the verified GET URL to receive the same owner-scoped JSON as a `nosniff` attachment. The Research receipt offers both an inline verification link and a download action; each request repeats owner and integrity checks.
- The owner-only `GET /api/decision-capsules/<capsule-id>/share` reports whether a public copy is active without returning its bearer token.
- `POST /api/decision-capsules/<capsule-id>/share` supports a no-side-effect preview, publishing a previewed selection, and revocation. Publishing requires an explicit confirmation plus the preview hash; if the verified capsule history changes, the publish request is rejected and must be previewed again.
- `GET /api/decision-capsules/public/<token>` is a public, `no-store` endpoint and accepts an optional `?download=1` attachment request. Its random 256-bit token is returned only once; only the token's SHA-256 is stored. Revocation immediately makes the bearer URL return `404`.

Completed authenticated Research results now offer a **Save private Decision Capsule** action. It submits only the saved research run ID; the server retrieves and snapshots the owner-scoped sources and claims. Guest Judge results do not expose the action because they have no persisted account run. The Research interface displays the integrity hash and links to the owner-authenticated verification response after the API confirms the SHA-256. Repeating a save uses the existing idempotent owner/run contract. This captures research provenance only and does not create a forecast, paper order, or outcome assessment.

The server constructs the snapshot from database records; clients cannot provide snapshot JSON or a claimed digest. `service_role` is used only in server routes and has table-level `SELECT`/`INSERT`, with no `UPDATE` or `DELETE`. Browser roles receive no table grants. A composite foreign key prevents linking a run owned by another user.

## Integrity boundary

Canonical JSON sorts object keys recursively, retains array order, and hashes UTF-8 bytes with SHA-256. This detects snapshot changes when checked against the stored digest. It does **not** prove that research claims are true, that the hash was independently witnessed, or that a model forecast was accurate. The original snapshot contains no fabricated prediction or outcome. Future amendments and outcomes must be modeled as separate append-only records.

Snapshots are limited to 240 KiB by the application (the database enforces a 256 KiB JSONB limit). The migration is additive and is not automatically applied by the API.

## Production deployment record

The private table migration was applied to production Supabase on 2026-11-03 and recorded as `20261103060730_private_decision_capsules`. A read-only post-migration check confirmed RLS is enabled, `anon` and `authenticated` have no table access, and `service_role` has `SELECT` and `INSERT` without `UPDATE` or `DELETE`. The table had no rows at verification time. Supabase's security advisor reports the expected informational `rls_enabled_no_policy` notice: this table intentionally has no user-role policies because the API uses the service role after checking the authenticated owner. No authenticated capsule create/read journey was exercised during this schema verification.

The Research desk's **Saved capsules** control reopens the most recent 50 capsules for the signed-in owner after navigation or reload. `GET /api/decision-capsules` returns a minimal owner-scoped index (question, creation time, ID, and snapshot hash); it validates each returned snapshot before exposing it. Selecting a record loads its append-only event history through the owner-authenticated endpoint. Guest Judge Research does not call or render the private capsule index.

## Append-only forecast and outcome history

The additive `decision_capsule_events` migration extends a capsule without rewriting its original snapshot. `GET /api/decision-capsules/<capsule-id>/events` returns the verified chain; `POST` accepts one strict `forecast` or `outcome` event. Both require the capsule owner to be signed in, are `no-store`, and conceal capsules owned by another user. Each event is SHA-256 hashed over canonical JSON and links to the prior event hash (the first links to the original capsule hash). The database append function serializes concurrent writes per capsule and checks the expected chain head; idempotency keys make retries safe.

New forecasts record an exact instrument class (`us_equity`, `reality_token`, or `us_stock_perpetual`), symbol, reference price, user-reported source URL and source timestamp, direction, threshold, horizon, and optional probability that the threshold event occurs. The source metadata is bound into the event hash, but its authenticity and the entered price are not independently verified. Older forecast events without source metadata remain verifiable with their original hashes; new submissions require both provenance fields. Outcomes are accepted only at or after that forecast's horizon. Return, threshold result, and Brier score (when a probability was supplied) are calculated by the server. An outcome explicitly says `reportedBy: "user"`; its source URL, source timestamp, and observed value are submitted by the owner and are not independently verified. Probability scores are therefore descriptive for that reported observation, not evidence of calibration or predictive skill.

The existing Research capsule receipt now includes a compact history panel for recording forecasts and their later observations. The panel uses the three distinct instrument types and does not prefill a price from a different market. It shows the forecast, outcome, and event time, supports appending a source-referenced user outcome after the horizon, and remains owner-authenticated. Simplified Chinese UI strings are included. It does not create paper trades or imply calibrated skill.

Private event history remains append-only. Hash verification establishes that records have not changed relative to the stored chain; it does not establish source authenticity, forecast quality, independent witnessing, or tamper resistance against privileged database operators.

## Public capsule copies

Public sharing is opt-in and owner-only. The owner chooses whether to disclose the research question and summary, evidence sources and claims, and/or forecasts and outcomes. The interface requests a server-built preview, displays the exact JSON, and requires a separate confirmation. Publishing binds that exact preview hash; an intervening event makes the confirmation stale. Account IDs, research-run IDs, source-row IDs, and private idempotency keys are excluded from the public projection. Only HTTPS source links are included.

The public endpoint verifies the snapshot SHA-256 and a separately re-hashed, privacy-safe event chain. It applies an atomic per-IP limit of 60 reads per minute using the existing hashed OAuth limiter; rate-limit storage failure fails closed. The original capsule hash is retained as a reference anchor, but the redacted public copy does not let third parties reconstruct or verify undisclosed private fields. Public-copy integrity proves only that the disclosed copy has not changed since publication. It does not authenticate user-reported data, prove the original research was correct, or establish skill. Public forecast outcomes remain explicitly labeled user-reported.

The publication table has RLS enabled and no browser-role grants. The service role can select and insert publication records and update only `revoked_at`; revoked links cannot be reactivated. Only one active publication per capsule is allowed; a replacement requires revocation. The migration is additive and must be applied after the capsule event migration. It is not run automatically by the application.

Isolated unit, route, localization, and PostgreSQL permission/revocation tests run in CI. No live production publication or revocation flow has been exercised as part of this implementation increment.

The capsule timeline summarizes hit rate and mean Brier score from resolved outcomes in that capsule. These calculations use the server-stored forecast/outcome fields from the integrity-verified chain; they are descriptive of the owner's reported observations and are not independent performance evidence. An exploratory five-bin calibration gap is withheld until at least 20 probability-bearing outcomes exist. Even above that threshold it is a small-sample diagnostic, not a validated skill or alpha claim. Outcome source links and their recorded source timestamps are shown for inspection; source authenticity is not checked.
