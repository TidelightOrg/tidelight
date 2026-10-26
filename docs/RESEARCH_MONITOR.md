# Research Monitor

Research Monitor turns a saved company thesis into a private, dated sequence of manual evidence reviews. It reuses the existing Agent Flow source collection and risk gates. It does not submit orders, modify Nightwatch, or run in the background.

## User path

1. Create a monitor with a supported US issuer ticker and a 12–440 character thesis.
2. Select Review this thesis to open Market Research with the saved thesis.
3. Run the normal evidence flow. A dated observation is added only after the completed research run is saved.
4. Return to Research Monitor to inspect linked sources, quote freshness at capture, evidence balance, gate reasons, thesis revision, and changes from the previous run.
5. Revise the thesis to create an immutable revision, or archive it. Archived monitors retain evidence and revision history.

The first release allows up to 12 active monitors per account. Reviews are manual and use the existing research quota and provider path. The thesis length fits the existing research question limit without silently truncating the saved thesis.

## Difference semantics

The Monitor reports changes in captured source URLs, the model stance, and support/counter-evidence point counts. These compare saved outputs. They do not prove claim truth, source entailment, publisher independence, or that the thesis is correct. Confidence is model confidence, not an accuracy score. Missing source dates remain missing. Quote freshness is shown as captured and can age.

## Data and security

- All reads are constrained to the authenticated owner.
- Create and thesis revision use authenticated PostgreSQL functions; direct browser table mutations are not granted.
- Composite owner foreign keys prevent attaching another account's research run.
- Revisions and observations cannot be updated or deleted by authenticated users.
- Archiving changes status while preserving the research history.
- Runs remain manual; Nightwatch paper-trading schedules are not reused.

## Not in the first release

Scheduled runs and material-change alerts need a separate opt-in cadence, bounded provider cost, idempotent scheduling, alert thresholds validated against the frozen human-reviewed benchmark, delivery preferences, retry visibility, and a kill switch. Public benchmark claims require completed independent review and adjudication.

## Release gate

Apply the forward migration in a staging database; verify owner isolation, RLS and database advisories; run tests, typecheck, lint, and production build; inspect signed-in and signed-out paths at desktop and narrow mobile widths across supported themes before production migration.
