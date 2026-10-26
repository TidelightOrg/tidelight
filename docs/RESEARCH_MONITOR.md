
# Research Monitor

Research Monitor turns a saved company thesis into a private, dated sequence of manual evidence reviews. It reuses the existing Agent Flow source collection and risk gates. It does not submit orders, modify Nightwatch, or run in the background.

## User path

1. Create a monitor with a supported US issuer ticker and a 12–800 character thesis.
2. Select **Review this thesis** to open Market Research with the saved thesis.
3. Run the normal evidence flow. The application writes a dated observation only after it saves the completed research run.
4. Return to **Research Monitor** to inspect the source links, quote freshness at capture, counter/support evidence counts, gate reasons, thesis revision, and differences from the previous run.
5. Edit thesis to create an immutable revision, or archive it. Archive preserves observations and revision history.

The first release allows at most 12 active monitors per account. Reviews are manual and consume the existing research quota/provider path.

## Difference semantics

The Monitor reports changes in captured source URLs, first-asset model stance, and displayed evidence point counts. These are output comparisons. They do not prove the underlying claims, publisher independence, or that the thesis is true. Confidence remains explicitly model confidence and is not the evaluation score. A missing source date remains missing; a quote timestamp is shown as captured and can age.

## Data and security

- Monitor, revision, observation, and run reads are constrained to the authenticated owner.
- Creation and thesis edits run through authenticated PostgreSQL functions; direct browser mutations are not granted.
- Composite owner foreign keys prevent attaching a different user's research run to a monitor.
- Observations and revisions cannot be updated or deleted by authenticated users.
- Archiving only changes monitor status; it preserves the research history.
- The worker remains manual; do not reuse Nightwatch's paper-trading schedules.

## Not yet released

Automatic schedules and material-change alerts require separate opt-in cadence, provider cost limits, idempotent scheduling, alert thresholds validated against the frozen human-reviewed benchmark, delivery/preferences, retry visibility, and an operator kill switch. Public benchmark claims require completed independent reviewer labels and adjudication.

## Release gate

Apply the forward migration in a staging/preview Supabase database, verify owner isolation and RLS/advisors, run automated tests/typecheck/lint/build, and manually verify signed-in and signed-out paths at desktop and narrow mobile widths in all supported themes before production migration/deployment.
