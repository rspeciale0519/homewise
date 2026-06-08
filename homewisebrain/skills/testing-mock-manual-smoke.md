---
type: skill
status: provisional
confidence: medium
updated: 2026-06-07
sources:
  - transcript:2026-05-19
  - code:prisma/seed.ts
---

# Tests mock Prisma+Supabase — manual smoke is the real validation

## When to use
Validating any data-touching feature in homewise before declaring it done.

## The approach
1. The vitest suite **mocks Prisma and Supabase**, so green tests prove logic shape, NOT
   end-to-end DB/storage behavior. For data features, do a manual end-to-end smoke test
   (browser via chrome-devtools MCP, against the real shared Supabase project).
2. Treat destructive operations as irreversible: there is **no automated re-seeding**.
   Build = `prisma generate && next build` (no CI, no `prisma.seed` key). `npm run db:seed`
   (`prisma/seed.ts`) seeds only agents + AI configs, NOT documents. Document seeds
   (`seed-documents.ts`, `seed-data-documents.ts`) are unwired — only run if a dev types
   `npx tsx` explicitly.
3. So: bulk-deleted Document Library rows are **gone permanently** unless someone manually
   re-runs the document seed script. Bundled files in `public/documents/` remain, but DB
   rows don't auto-restore.

## Pitfalls & anti-patterns
- Don't trust green unit tests as proof a DB mutation works — they mock the client.
- Don't assume a "reset" will restore deleted data; confirm a seed script exists AND is
  wired before relying on it.

## Evidence
Transcript 2026-05-19 (bulk-delete) — confirmed no CI, no seed key, document seeds unwired.

## Revision log
- 2026-06-07 — created from transcript backfill; provisional.
