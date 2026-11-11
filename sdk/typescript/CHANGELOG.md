# Changelog

## Unreleased

- Add unauthenticated public Decision Capsule retrieval and local SHA-256 verification.
- Add a read-only public capsule method to the authenticated client.
- Preserve public capsule server error messages and make the package build self-contained with its Node type dependency.

## 0.1.2

- Publish the current tested client with registry-facing documentation aligned to the supported API and release path.

## 0.1.1

- Publish the coordinated package set at `0.1.1` with no API contract changes.

## 0.1.0

- Add a typed TypeScript client for supported Tidelight API v1 market, research job, and webhook operations.
- Add bounded retries, request timeouts, pagination, and request ID handling.
- Keep credentials caller supplied and server side.
