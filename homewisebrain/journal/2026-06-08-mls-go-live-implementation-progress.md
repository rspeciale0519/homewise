# 2026-06-08 — MLS Go-Live Implementation Progress

## Summary

Implemented and pushed the unblocked code portions of `.claude/plans/feature-mls-go-live.md`
on `feature/mls-go-live` through commit `5fa7fc3`.

Completed and verified locally:
- MLS Grid config/schema/RESO/query-builder foundation.
- Public MLS photo proxy and prod Supabase `mls-photos` bucket creation.
- Compliant sync using `ListingKey`, persisted cursors, `MlgCanView=false` delete/photo purge,
  price/sync/backfill events, open-house sync, and `withIdx()` public visibility filtering.
- IDX attribution/disclaimers and Back Office analytics gating with `ANALYTICS_BO_ENABLED=false`.
- Scale prep: polygon bbox prefilter, pgvector code/schema/SQL prep, embedding backfill,
  media budget guards, and lightweight selects.
- Phase 10 code safety: typed Inngest event schemas, normalized MLS agent IDs, agent match
  warning after backfill, alert suppression during initial backfill, and absolute email image URLs.

Verification passed before the latest uncommitted launch-flag follow-up:
- `npm run type-check`
- `npm run lint`
- `npx vitest run` (`74` files / `501` tests)
- `npm run build`

## Launch-Gate Follow-Up

Added and verified a public MLS launch gate:
- `.env.example`: `MLS_PUBLIC_SEARCH_ENABLED=false`
- `src/lib/mls-launch.ts`: shared `mlsPublicSearchEnabled()` helper.
- `src/providers/index.ts`: Stellar provider is used only when `PROPERTY_PROVIDER=stellar`
  and `MLS_PUBLIC_SEARCH_ENABLED=true`; otherwise public reads stay on mock data.
- `src/lib/mls-alert-suppression.ts`: MLS alerts are suppressed while public MLS launch is disabled.
- `src/providers/index.test.ts`: tests the launch gate.
- `.claude/plans/feature-mls-go-live.md`: notes that the gate exists but Phase 10 dry-run is
  still unchecked until real counts/E2E pass.

Verification passed for this follow-up:
- `npm run type-check`
- `npm run lint`
- focused Vitest for provider/MLS helpers
- full `npx vitest run` (`75` files / `503` tests)
- `npm run build`

## Phase 9 Pgvector Update

After explicit command approval, ran the prepared additive pgvector SQL against shared/prod
Supabase and then ran `npx dotenv -e .env.local -- npm run db:push` successfully. The first
plain `npm run db:push` attempt failed before connecting because Prisma did not see
`DIRECT_DATABASE_URL`; rerunning through dotenv succeeded and generated Prisma Client.

## Remaining Blockers

- Vercel Production has legacy `MLS_GRID_CLIENT_ID`/`MLS_GRID_CLIENT_SECRET` and `MLS_OFFICE_ID`,
  but is missing required `MLS_GRID_TOKEN`, `MLS_GRID_ORIGINATING_SYSTEM_NAME`,
  `MLS_IMAGE_SIGNING_SECRET`, `ANALYTICS_BO_ENABLED=false`, and
  `MLS_PUBLIC_SEARCH_ENABLED=false`. `MLS_OFFICE_ID` must be unset for full site-wide IDX launch.
- Live MLS token, exact `OriginatingSystemName`, and sample data are required before safe dry-run,
  full backfill, count verification, E2E smoke, deploy monitoring, and freshness checks can be
  marked complete.

## Next Best Action

When command execution is available again, verify the uncommitted launch flag, commit/push it,
then wait for explicit prod DB/env/backfill approval and required live MLS values.
