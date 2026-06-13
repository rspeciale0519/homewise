# homewise brain — STATE
Updated: 2026-06-12

## Current focus
**Browser E2E smoke of the MLS suite: 100% PASS (2026-06-12, PR #57, develop=main=726ecb7,
prod READY).** Full no-email-scope smoke per `.claude/plans/test-e2e-browser-smoke.md`
(phases A–J, chrome-devtools MCP, results in `docs/temp/e2e-smoke-results.md`). Six real
defects found & shipped: RESO propertySubType synonym mapping for the type filter, real
status options, missing Save Search UI, unmounted useTrackView (Recently Viewed was always
empty), raw-cuid favorites/recently-viewed cards, exclusive-edit 400 on null optionals.
e2e-* test accounts + listings remain in the shared DB (clearly labeled).

**MLS native feature suite SHIPPED (2026-06-12, PR #56, ffa478f, prod READY).**
14 features built natively on the direct MLS Grid connection per
`.claude/plans/feature-mls-native-suite.md` (all 8 phases ✅ in-file): price history +
TCO panel, compare tool, open-house RSVP, exclusive (pocket) listings w/ admin approval,
commute-time search (Mapbox isochrones), listing performance + client-listing matcher +
anomaly scan, weekly open-house digest + campaign recommendations, auto-tags + match
scores. New additive tables: PriceHistory, OpenHouseRsvp, ClientListingMatch,
ListingViewDaily, ListingAnomaly. Public visibility helper now = IDX OR approved-manual.
Prod MLS surfaces still mock-gated by launch flags until live creds.

## Previous focus
**MLS go-live PROVEN against live Stellar demo data on `feature/mls-go-live`** (pushed
through `9275b53`). Rob received MLS Grid demo-portal tokens (in .env.local under "MLS
DEMO DATA"; IDX token → `MLS_GRID_TOKEN`, base `https://api-demo.mlsgrid.com/v2`,
`MLS_GRID_ORIGINATING_SYSTEM_NAME=mfrmls`). Full backfill of 12,793 listings + open
houses completed into shared/prod Supabase; search/detail/featured/attribution/photo
proxy all smoke-verified in browser; six real defects found by live-feed testing were
fixed and verified (see journal 2026-06-10). Public search remains gated off in Vercel
prod (`MLS_PUBLIC_SEARCH_ENABLED=false`); local .env.local has it on for demo browsing.
Confirmed decision: skip the Back Office feed for launch → CMA/market-stats ship gated
OFF (`ANALYTICS_BO_ENABLED=false`).

## Latest synopsis
2026-06-10: Demo data go-live proof completed end-to-end. Wired demo IDX token, probed
feed (12,933 records, OriginatingSystemName=`mfrmls` lowercase, MlgCanUse=[IDX], media
needs `User-Agent: <token>`), ran full Inngest backfill (12,793 listings: 9,606 Active /
1,538 Pending / 1,620 Sold / 29 Coming Soon; counts reconcile vs API after 132
MlgCanView=false exclusions), open houses attached (demo slots are historical → expired-
clear empties them; correct behavior), featured-by-office proven with Patterson Realty
stand-in (`HOMEWISE_OFFICE_MLS_ID=MFR260504438`). Browser smoke (chrome-devtools): home,
featured cards w/ attribution + land 0bd/0ba fallbacks, /properties search "12793
properties found" + MLS GRID disclosure + map, detail page w/ 40-photo gallery, IDX
disclaimer, courtesy/listing#, open-house+walk-score+schools sections. Six live-feed
defects fixed (commit `9275b53`): land-listing bath/bed/sqft fallbacks; 10× parallel page
writes (0.8/s → ~7/s); single-step page sync (raw RESO page exceeded Inngest step-output
limit — would also break in Cloud); `images.localPatterns` for the proxy route;
canonical-identity storage keys (token rotation orphaned cache); self-healing photo
refresh via single-entity `$expand=Media` + 429 propagation. Verification: lint, tsc,
vitest 75 files / 507 tests, production build — all green.

Demo-data quirks (NOT bugs): no school fields at all; media URLs expire ~2h (self-heal
covers it); media server rate-limits bursts (429s on first-view; cache warms over time);
demo open houses all in the past. Unresolved oddity: the FIRST backfill's photo HMAC sigs
didn't match the current secret (process-specific, never explained); full re-import
re-signed everything and sig survey now 12,788/12,788 ok.

## Open threads
- **MLS go-live:** demo-proven. Remaining for real launch: live (non-demo) MLS Grid token +
  real `OriginatingSystemName`, set Vercel prod `MLS_GRID_TOKEN`/`MLS_GRID_BASE_URL`/
  `MLS_GRID_ORIGINATING_SYSTEM_NAME`/`HOMEWISE_OFFICE_MLS_ID` (real office), flip
  `PROPERTY_PROVIDER=stellar` + `MLS_PUBLIC_SEARCH_ENABLED=true`, re-point sync, backfill,
  E2E. `OPENAI_API_KEY` missing locally → embeddings/NL search unproven against demo data.
- **Agent-listings widget** untested against demo (auto-mode denied editing a prod Agent
  row to link `mlsAgentId=MFR260504162`; Rob can set an agent's MLS ID via admin UI to see
  their listings populate).
- **Local demo env note:** stale Windows portproxy rules hijack 127.0.0.1:3000-3005 (dead
  WSL IP 172.31.166.45) — run dev on `127.0.0.1:3100`; after dev-server restart, re-register
  Inngest with `PUT /api/inngest` or invocations 404 silently.
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
