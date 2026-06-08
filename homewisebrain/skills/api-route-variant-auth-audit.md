---
type: skill
status: provisional
confidence: medium
updated: 2026-06-07
sources:
  - transcript:2026-05-28
  - commit:7fe8dad
  - code:src/lib/admin-api.ts
---

# Audit EVERY route variant for auth; add explicit `select` on public reads

## When to use
Adding or reviewing any API route in homewise, especially a NEW feature's routes.

## The approach
1. The auth gate (`requireAuthApi`/`requireStaffApi`/`requireAdminApi`, `src/lib/admin-api.ts`)
   is reliably applied to **collection** routes (`GET/POST /api/...`). It is reliably
   **MISSED** on item-level (`[id]`), auxiliary, and upload routes. Audit every variant:
   `[id]` PATCH/DELETE, signed-URL/upload endpoints, sub-resources.
2. Every **public** `findMany` MUST have an explicit `select` listing only safe columns.
   Default Prisma selection leaks unique/token/PII columns.
3. Verify the fix **live**: poll the previously-leaking endpoint after deploy and confirm it
   flips `200 → 401` in prod (~5 min after the Vercel build goes READY).

## Pitfalls & anti-patterns
- 2026-05-28 security review found 7 issues, ALL in the newest (Training Hub) feature:
  unauthenticated `PATCH/DELETE` on `/api/admin/training/tracks/[id]` (anyone could delete
  any course), an upload route returning signed URLs unauthenticated, and public
  `GET /api/agents` running `findMany` with no `select` — leaking `inviteCode` (an
  account-claim token), `inviteExpiresAt`, email, phone.
- The gap is **consistent**: collection route guarded, item/aux routes forgotten. Don't
  assume "the feature is gated" because the list endpoint is.

## Evidence
Security pass `7fe8dad` "gate unauthenticated training routes, lock down agent + billing
leaks". Single review, single feature — provisional until reconfirmed on another feature.

## Revision log
- 2026-06-07 — created from transcript backfill; provisional (one occurrence).
