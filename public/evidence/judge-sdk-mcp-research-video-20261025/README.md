# Fresh SDK/MCP research run — 25 October 2026

This is a redacted, auditable `script` terminal-session capture, not a browser screen recording. The captured commands ran from the clean consumer directory `work/revision-consumer` on branch `feat/judge-sdk-mcp-research-video-20261025`; the timing sidecar is `terminal-session.timing`.

Captured and passed: npm install/version checks for `@tidelight/sdk`, `@tidelight/mcp`, `@tidelight/react`, and `@tidelight/cli`, all `0.1.2`; Python install/import for `tidelight==0.1.2`; CLI help; and a published Python SDK status read of the already completed AAPL job. The earlier SDK/MCP lifecycle JSON traces remain included as prior run records, but are not claimed as visible in this revised capture. No report bodies or credentials are included.

The npm SDK created AAPL job `47e753ed-7f0d-43ed-81c7-b7e864280a07` with request `9057f417-38a8-4b24-b675-25626b3189d5`; Python polled that same job and observed `complete`. Direct MCP created MSFT job `f0166629-1db2-4183-8adb-16a3b9e4c3b7` with request `049426a5-a205-4ade-afed-1cc35daa60f6` and observed it queued on the bounded status call. The stdio bridge was not used to start a job; its safe protocol check exposed research start/status/cancel.

The source cast and JSON traces contain only allowlisted metadata. `SHA256SUMS.txt` covers every file in this directory, including the timing sidecar. No MP4 is published because a genuine terminal replay video was not produced; the UI links only the real cast.
