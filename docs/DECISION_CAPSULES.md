# Private Decision Capsules (v1)

Decision Capsules preserve an immutable, private snapshot of a completed research run, persisted source lineage, and persisted claim/quote records. The capsule API is additive: it reads existing `research_runs`, `research_sources`, and `research_evidence` records and does not replace saved research or public replay links. If source or evidence rows exceed the bounded capture limits, the API refuses to create a potentially incomplete capsule.

## API

- `POST /api/decision-capsules` with `{ "researchRunId": "<uuid>" }` requires a signed-in user and snapshots only a completed run belonging to that user.
- Repeating the request for the same owner and run returns the existing capsule. The database enforces one capsule per owner/run.
- `GET /api/decision-capsules/<capsule-id>` requires the owning signed-in user. It recomputes the canonical SHA-256 over `original_snapshot` and returns the snapshot only when the digest matches.
- Both endpoints are private and `no-store`. There is no public lookup, share token, capsule revocation, outcome record, or calibration claim in v1.

The server constructs the snapshot from database records; clients cannot provide snapshot JSON or a claimed digest. `service_role` is used only in server routes and has table-level `SELECT`/`INSERT`, with no `UPDATE` or `DELETE`. Browser roles receive no table grants. A composite foreign key prevents linking a run owned by another user.

## Integrity boundary

Canonical JSON sorts object keys recursively, retains array order, and hashes UTF-8 bytes with SHA-256. This detects snapshot changes when checked against the stored digest. It does **not** prove that research claims are true, that the hash was independently witnessed, or that a model forecast was accurate. The original snapshot contains no fabricated prediction or outcome. Future amendments and outcomes must be modeled as separate append-only records.

Snapshots are limited to 240 KiB by the application (the database enforces a 256 KiB JSONB limit). The migration is additive and is not automatically applied by the API.

## Production deployment record

The private table migration was applied to production Supabase on 2026-11-03 and recorded as `20261103060730_private_decision_capsules`. A read-only post-migration check confirmed RLS is enabled, `anon` and `authenticated` have no table access, and `service_role` has `SELECT` and `INSERT` without `UPDATE` or `DELETE`. The table had no rows at verification time. Supabase's security advisor reports the expected informational `rls_enabled_no_policy` notice: this table intentionally has no user-role policies because the API uses the service role after checking the authenticated owner. No authenticated capsule create/read journey was exercised during this schema verification.
