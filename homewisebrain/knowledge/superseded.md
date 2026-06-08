---
kind: knowledge
slug: superseded
status: current
updated: 2026-06-07
layer: reference
sources:
  - git:log-all
  - memory:MEMORY.md
---

# Superseded — homewise

Where current reality overrides an older doc/plan/comment/assumption. Memory and
verified code win; the stale version is recorded here with both citations + reason.

- **Training Hub "redesign" → Training Hub v1.** The 2026-03 redesign
  (`docs/plans/2026-03-08-training-hub-redesign.md`, shipped PR #7) was rebuilt from
  scratch by **v1** (`feature-training-hub-v1.md`, PR #51/#53). Treat v1 as the
  authoritative Training Hub; the redesign docs are historical. Reason: v1 introduced
  Course→Section→Content entities, category entities, status lifecycle, and the
  agent/public/admin split.

- **`middleware.ts` → `src/proxy.ts`.** Next.js 16 moved middleware to the `proxy.ts`
  convention (commit `49e0a1d`). The old `middleware.ts` is in `archive/`. Any guidance
  referencing `middleware.ts` for this repo is stale — edit `src/proxy.ts`.

- **"jsdom fails on Vercel" (stale code comment) → jsdom works server-side.** A defensive
  comment claimed jsdom breaks on Vercel; the `/learn` page proves `jsdom@^3` works
  server-side (sanitization centralized in `AdminAuthoredHtml`). Don't architect around
  the claimed limitation. Verified 2026-05-28. Reason: stale comment, current runtime
  evidence contradicts it.

- **`prisma migrate dev` → `prisma db push`.** Plans/docs that imply a migrations
  workflow are superseded: this repo has no working migrations replay (shadow-DB P1014),
  only a `db:push` script. See [[skill-supabase-prisma-db-push]]. Reason: existing
  migration `20260418000000_riusa_platform_groundwork` won't replay into a fresh shadow DB.

- **Pricing page = plan management (assumption) → agent recruitment.** `/pricing` is a
  PUBLIC recruitment surface for NEW agents, not existing-agent plan management
  ([[memory]] project_pricing_page_intent). Reason: business intent clarified by user.

- **Legacy training `category` string column → `categoryId` entity + audience flag.**
  v1 migrated legacy `agent|public|both` category strings to category entities +
  `agent_only|public_only|both` audience flag; the legacy `category` string column is
  preserved for now, to be dropped in v2. Don't write the old string column.
