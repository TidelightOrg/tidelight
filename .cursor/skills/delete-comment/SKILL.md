---
name: delete-comment
description: >-
  Review every code comment, delete tautologies and stale notes, record excuses,
  and move non-obvious decisions into docs/adr. Use when asked to delete comments,
  clean comments, ban new comments, or repeat the comment ratchet.
---

# Delete comments

Review every code comment. Put each one in one category, then change the tree so the comment does not remain as narration.

For a stricter pass over a diff, see [pstack's no-comments skill](https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md). This skill is the repository-wide pass: four categories, ADRs, an excuse list, and a ratchet that only shrinks.

## Categories

- **Tautology.** The comment repeats what the code already shows.
- **Excuse.** The comment lets a hacky implementation slide.
- **Stale.** The comment refers to code or details that no longer apply.
- **Decision record.** The comment documents an important, non-obvious decision.

## Actions

- Tautology or stale: delete it.
- Excuse: delete it. Add the hack to the pull request checklist with the file, the line of the remaining code, and a short description. Open a tracking issue only when that does not wait on confirmation.
- Decision record: move the decision into an ADR under `docs/adr/`. Group related decisions. Do not leave the narration in code.
- Keep a comment when the code or tooling needs it to function. That includes `eslint-disable`, `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck`, shebangs, `syntax=docker/dockerfile`, license headers, `Do not edit by hand` markers emitted by a generator, and JSDoc in JavaScript that supplies `@param`, `@returns`, `@type`, `@template`, or `@typedef` types. Also keep commented-out configuration an operator is meant to uncomment. Do not keep a comment merely because it is old.

Applied files in `supabase/migrations/` are immutable history. Copy their decision records into an ADR and leave the SQL comments in place.

## Ratchet

`npm run lint` runs ESLint and `node scripts/check-comment-baseline.mjs`.

- `eslint/no-new-comments.mjs` rejects any JavaScript or TypeScript comment that is not in `config/comment-baseline.json`. Shebangs stay allowed.
- `scripts/check-comment-baseline.mjs` does the same for every inventoried language and fails when the allowlist still names a deleted comment.
- `ceiling` must equal the allowlist length. After this file exists on `main`, a larger ceiling fails the check.

`scripts/comment-inventory.mjs` is the shared extractor. When a kept comment is deleted, remove that entry from the allowlist and set `ceiling` to the new length. Do not add an entry for a new comment.

## Repeat the pass

1. Run the inventory and read every comment with the code around it.
2. Classify, delete, and write or update ADRs.
3. Rebuild the baseline from the comments that remain. The ceiling may only fall.
4. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`.
