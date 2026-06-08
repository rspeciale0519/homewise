# homewise brain — STATE
Updated: 2026-06-08

## Current focus
**MLS go-live implementation on `feature/mls-go-live`.** The audit-corrected v2 plan at
`.claude/plans/feature-mls-go-live.md` is the source of truth. All unblocked local code,
DB, and Vercel env setup work is implemented and pushed through `449274c`; verification
passed for type-check, lint, full Vitest, and production build. Public property reads use
Stellar only when `PROPERTY_PROVIDER=stellar` and `MLS_PUBLIC_SEARCH_ENABLED=true`, allowing
sync/backfill to run while public MLS search remains off until counts/E2E pass.
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
email image URLs. Later pushed commits added the public launch gate, completed shared/prod
pgvector SQL + `db:push`, updated Vercel production env gating/signing values, and recorded
preview deploy status. Full local verification passed after the latest code change:
`npm run type-check`, `npm run lint`, `npx vitest run` (75 files / 503 tests), and
`npm run build`.

Remaining true blockers are production/live-state, not ordinary code: Phase 9 pgvector
SQL + `db:push` completed successfully against shared/prod Supabase on 2026-06-08 after
explicit command approval. Vercel Production has `MLS_OFFICE_ID` removed and now includes
`ANALYTICS_BO_ENABLED=false`, `MLS_PUBLIC_SEARCH_ENABLED=false`, and a generated
`MLS_IMAGE_SIGNING_SECRET`; it still has legacy MLS Grid client id/secret and is missing
required `MLS_GRID_TOKEN` plus exact `MLS_GRID_ORIGINATING_SYSTEM_NAME`. Live token/sample
data are needed for safe dry-run, full backfill, counts, E2E smoke, and freshness verification.
Latest Vercel preview for `feature/mls-go-live` is Ready at
`https://homewise-ii0xeorlz-robs-projects-c72886ba.vercel.app`, but chrome-devtools MCP
was unavailable in this session, so browser smoke remains unverified.

## Open threads
- **MLS go-live:** branch `feature/mls-go-live` is clean/pushed. Proceed only after receiving
  the live `MLS_GRID_TOKEN`, exact `MLS_GRID_ORIGINATING_SYSTEM_NAME`, sample/dry-run data or
  approval path, and chrome-devtools/browser verification access.
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
