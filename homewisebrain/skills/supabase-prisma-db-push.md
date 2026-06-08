---
type: skill
status: established
confidence: high
updated: 2026-06-07
sources:
  - transcript:2026-05-19
  - transcript:2026-05-27
  - code:package.json
  - code:CLAUDE.md#Rule-8
---

# Schema changes: `prisma db push`, never `migrate dev`

## When to use
Any time you change `prisma/schema.prisma` in homewise.

## The approach
1. Edit `prisma/schema.prisma`.
2. Run `npm run db:push` (`prisma db push`) for additive changes. No `migrations/` folder
   is produced or expected.
3. Commit the schema change **atomically** — never commit a schema edit without the
   corresponding push applied, or the repo is in a schema-without-table state and the
   feature fails.
4. Connect via the **Supavisor pooler** host only (CLAUDE.md Rule 8): transaction mode
   :6543 for app queries, session mode :5432 for direct ops. Never the direct `db.*` host.

## Pitfalls & anti-patterns
- `prisma migrate dev` FAILS here: shadow-DB validation errors with `P1014 (underlying
  table for model Agent does not exist)` because existing migration
  `20260418000000_riusa_platform_groundwork` won't replay into a fresh shadow DB. Don't
  reach for it.
- **One shared Supabase project** serves local + prod — every `db push`/seed writes to
  PRODUCTION. Treat all DB writes as production-facing.
- Autonomous prod DB writes are hard-blocked by the harness security classifier even with
  in-chat authorization. Either add a Bash permission rule, or have the user run it via the
  `!` prefix in-session.
- Windows: `prisma generate` can hit EPERM/DLL lock when the dev server holds the client —
  stop the server or just retry; types still regenerate. Vercel's build is unaffected.

## Evidence
Transcript 2026-05-19 (bulk-delete): `migrate dev` blocked twice → resolved with `db push`
("in sync, done in 4.57s"). Reconfirmed 2026-05-27 (Training Hub v1). `package.json` has
`db:push` only, no `migrate` script.

## Revision log
- 2026-06-07 — created from transcript backfill; established (independent reconfirmation
  across two feature efforts on different dates).
