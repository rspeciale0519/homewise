# homewise brain — STATE
Updated: 2026-06-08

## Current focus
**MLS go-live implementation on `feature/mls-go-live`.** The audit-corrected v2 plan at
`.claude/plans/feature-mls-go-live.md` is the source of truth. Code phases 1-10's
unblocked local work are implemented and pushed through `5fa7fc3`; verification passed
for type-check, lint, full Vitest, and production build. A follow-up launch gate has now
been verified locally and is ready to commit/push: public property reads use Stellar only
when `PROPERTY_PROVIDER=stellar` and `MLS_PUBLIC_SEARCH_ENABLED=true`, allowing sync/backfill
to run while public MLS search remains off until counts/E2E pass.
Confirmed decision: skip the Back Office feed for launch → CMA/market-stats ship gated
OFF (`ANALYTICS_BO_ENABLED=false`); everything else launches after live prod checks.

## Latest synopsis
2026-06-08: MLS go-live v2 moved from plan to implementation. Completed and pushed:
config/RESO/schema/db push, MLS Grid static token query builders, helper tests, public
photo proxy + prod `mls-photos` bucket, compliant sync using `ListingKey`, cursor
persistence, `MlgCanView=false` delete/photo purge, open-house sync, universal `withIdx()`
public read filtering, attribution/disclaimers, Back Office analytics gating, pgvector
code prep, polygon bbox prefilter, embedding backfill, media budget guards, typed Inngest
events, agent MLS ID normalization, backfill match warnings, and alert suppression/absolute
email image URLs. Latest pushed commits: `1decbfc` (Phase 10 safety checks) and `5fa7fc3`
(env blocker note). Full local verification passed: `npm run type-check`, `npm run lint`,
`npx vitest run` (74 files / 501 tests), and `npm run build`.

Remaining true blockers are production/live-state, not ordinary code: Phase 9 pgvector
SQL + `db:push` still needs explicit approval for this specific shared/prod schema change;
Vercel Production currently has legacy MLS Grid client id/secret and `MLS_OFFICE_ID`, but
is missing required `MLS_GRID_TOKEN`, `MLS_GRID_ORIGINATING_SYSTEM_NAME`,
`MLS_IMAGE_SIGNING_SECRET`, `ANALYTICS_BO_ENABLED=false`, and
`MLS_PUBLIC_SEARCH_ENABLED=false`; live token/sample data are needed for safe dry-run,
full backfill, counts, E2E smoke, and freshness verification.

## Open threads
- **MLS go-live:** branch `feature/mls-go-live` is clean/pushed at `5fa7fc3` before the
  uncommitted launch-flag follow-up. Finish verifying/committing that flag, then proceed
  only with explicit approval/values for prod DB/env/backfill/live verification.
- **Largest real gap:** live Stellar MLS credentials/sample data and prod Vercel env are
  not yet configured. Research only in `docs/temp/`. See [[knowledge/roadmap]].
- **Training Hub v2/v3** extracted as standalone plans (`269a6df`), not started. v1 shipped
  inert columns so v2 activates with no migration.
- **Admin shell isn't mobile** — features are built mobile-aware but the sidebar doesn't
  collapse < sm ([[memory]] feedback_mobile_first).

## Active skills in play
- [[skill-supabase-prisma-db-push]] — db push, never migrate dev (established)
- [[skill-build-vercel-monitor]] — monitor deploys after every push (established)
- [[skill-api-route-variant-auth-audit]] — gate every route variant (provisional)
- [[skill-ui-dnd-kit-drag-overlay]] — drag overlay tracking (established)
- [[skill-testing-mock-manual-smoke]] — manual smoke is the real validation (provisional)

## Notes
- Knowledge layer is `status: current` (built from evidence 2026-06-07), NOT via the
  formal knowledge-build runbook — treat build-status claims as code-verified-on-that-date;
  reconcile on next consolidation against `git log` since the watermark.
- Pre-production, sole-dev: squash develop→main without pause ([[memory]]
  feedback_develop_to_main_no_pause). Shared Supabase project = local writes hit prod.
- On conflict, prefer [[knowledge/superseded]] (memory + verified code override docs).
- Launch-flag follow-up verification passed after the earlier command-runner limit cleared:
  `npm run type-check`, `npm run lint`, focused Vitest, full `npx vitest run` (75 files /
  503 tests), and `npm run build`.
