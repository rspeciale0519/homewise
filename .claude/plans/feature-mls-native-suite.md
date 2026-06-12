# SPEC: MLS Native Feature Suite

## GOAL
Build the 14 MLS-dependent features from the dev-docs gap analysis (2026-06-11) natively on the
existing direct MLS Grid connection. No third-party IDX vendor anywhere. Back-Office-gated
(sold-data analytics) features are OUT OF SCOPE and must remain gated off.

## CURRENT STATE (do not rediscover)
- Branch base: `develop`. Workflow: Rule 9 (`/git-workflow-planning:start feature mls-native-suite`,
  `checkpoint <n> <desc>` per phase, `finish` at end). Squash to develop, promote develop→main
  without pausing (standing memory), verify Vercel deploys via `get_project.latestDeployment` then
  `get_deployment` by id (branch-alias lookups serve stale data).
- 12,793 Stellar demo listings synced (`mlsId` starts `MFR`, `mlgCanUse=["IDX"]`). Sync:
  `src/inngest/functions/mls-sync.ts` (+`mls-sync.mapper.ts`, `mls-openhouse.ts`), 15-min cron.
  Public read filtering: `withIdx()` in `src/lib/mls-visibility.ts` — applied on ALL public reads.
- Local dev MUST run on `127.0.0.1:3100` (stale Windows portproxy hijacks 3000–3005). After any
  dev-server restart, re-register Inngest: `PUT http://127.0.0.1:3100/api/inngest` (else invocations
  404 silently). Inngest dev server already runs on 8288.
- Shared Supabase = local writes hit prod. Schema changes: `npm run db:push` ONLY (never migrate
  dev), ADDITIVE-ONLY (no drops/renames of existing columns/tables). Pooler URLs per CLAUDE.md Rule 8.
- Demo-data quirks: no school-district fields; all open houses are in the PAST (expired-clear
  empties schedules) — open-house features must be verified with seeded/mocked future slots in
  tests, not live demo data; demo media server rate-limits bursts (photo 429s are normal).
- `OPENAI_API_KEY` is NOT set locally or in prod. All AI-dependent behavior must degrade gracefully
  without it and be unit-tested with mocked AI clients. Do not block on the key.
- `ANALYTICS_BO_ENABLED=false` everywhere. CMA/market-stats/sold-analytics stay gated. Do not touch.
- Tests: Vitest, co-located `.test.ts`, `vi.hoisted` + `vi.mock("@/lib/prisma")` pattern. Current
  suite: 75+ files, all green. Verify: `npm run type-check`, `npm run lint`, `npx vitest run`,
  `npm run build` (kill stale project node processes if prisma generate EPERMs).
- Charts: admin uses an existing chart approach (`src/components/admin/team-performance-chart.tsx`) —
  reuse its library; do not add a new chart dependency without checking it first.
- Mapbox token present (`NEXT_PUBLIC_MAPBOX_TOKEN`); map + polygon search already built
  (`listing-map-panel.tsx`, bbox prefilter in `stellar-mls-provider.ts`).
- Browser testing: chrome-devtools MCP only (never Playwright). Brain journal entry required per
  completed task (Stop hook enforces; file `homewisebrain/journal/<today>.md`).

## PHASES (in order; each ends with roadmap update + checkpoint + full verify)

### Phase 1 — Listing-page data features
Build: (a) **Price history**: new additive `PriceHistory` model (listingId, price, observedAt,
source); sync writes a row on detected price change + first-import row from `originalListPrice`;
timeline chart section on property detail page (render only when ≥2 points). (b) **Total cost of
ownership panel** on detail page: monthly mortgage (reuse existing calculator formulas in
`src/lib/calculators/`), property tax (taxAmount/12), HOA normalized by `hoaFrequency`, insurance
estimate via a named constant; clearly labeled as estimates. (c) **Open-house search filter**:
"Open House" toggle in /properties filters → provider/query filters listings whose
`openHouseSchedule` contains a future slot (JSON path or post-filter; document choice).
EXIT CRITERIA: unit tests for price-history capture (sync mapper/upsert path), TCO math, and
open-house filter logic pass in `npx vitest run` (shown); type-check/lint/vitest exit 0; detail
page renders both new sections locally (chrome-devtools screenshot or innerText check surfaced for
a listing with seeded history).

### Phase 2 — Comparison tool + Open House RSVP
Build: (a) **/properties/compare?ids=a,b,c,d** page (2–4 listings): side-by-side table — price,
$/sqft, beds, baths, sqft, lot, year, HOA, tax, walk/transit/bike scores, DOM, status, photo;
"Compare" entry points from favorites and listing cards (client state, no schema change). IDX
attribution + disclaimer on the page. (b) **Open House RSVP**: additive `OpenHouseRsvp` model
(listingId, openHouseKey, name, email, phone?, createdAt); RSVP form (Zod-validated API route) on
detail-page open-house section; notification email via existing Resend patterns to the matched
agent (`listingAgentMlsId` → Agent) else admin; agent-dashboard list of upcoming RSVPs.
EXIT CRITERIA: compare page renders 3 demo listings locally (evidence surfaced); RSVP API route
unit tests (validation, agent match, fallback) pass; full verify suite exit 0.

### Phase 3 — Exclusive (pocket) listings
Build: agent-dashboard CRUD for manual listings (`mlsSource: "manual"`): create/edit/archive own
listings only; required subset of Listing fields + photo upload to existing storage patterns;
admin approval queue (pending → active) in admin; public visibility: extend the public read filter
so approved manual listings appear alongside IDX listings (update `withIdx()` or introduce
`publiclyVisible()` wrapper used everywhere `withIdx` is used today — keep IDX compliance for MLS
rows intact); "Exclusive" badge on cards + detail; hard guard: MLS-sourced listings are never
editable via these routes (server-side check + test).
EXIT CRITERIA: visibility helper unit tests prove (IDX row shown, manual-approved shown,
manual-pending hidden, non-IDX MLS hidden); route tests prove agents cannot edit MLS rows or other
agents' manual rows; full verify suite exit 0; created manual listing visible in local /properties
search with badge (evidence surfaced).

### Phase 4 — Commute-time search
Build: search filter "max drive time to address": geocode input via Mapbox Geocoding, fetch Mapbox
Isochrone polygon for N minutes driving, feed polygon into the EXISTING polygon/bbox search path.
Server route proxies Mapbox calls (no token logic change client-side beyond existing patterns).
Degrade: if isochrone fails, clear error, no crash.
EXIT CRITERIA: unit tests for isochrone→polygon adapter (mocked Mapbox) pass; manual local check —
a commute search returns fewer results than unfiltered (counts surfaced in transcript); full
verify suite exit 0.

### Phase 5 — Agent intelligence (performance, matcher, anomalies)
Build: (a) **Listing performance**: additive view counter (e.g. `ListingViewDaily` listingId+date
unique, count) incremented server-side on detail-page views; agent dashboard panel per matched
listing (views, favorites count, RSVP count, inquiries via existing contact submissions if
linkable); (b) **Client-listing matcher**: on `mls/listing.synced` (and a daily sweep), match new
listings against agent-linked clients' criteria — inspect `Contact`/CRM models first and reuse
existing preference fields if present, else add minimal additive fields (budgetMin/Max, areas,
minBeds); agent dashboard "New matches for your clients" panel; (c) **Anomaly detection**: daily
Inngest job flagging active listings with price drop >15% in 7 days (uses Phase 1 PriceHistory),
DOM >180, duplicate address+city actives, zero photos; admin panel listing flags with dismiss.
EXIT CRITERIA: matcher + anomaly unit tests (mocked prisma) pass; agent dashboard renders
performance panel locally (evidence); full verify suite exit 0.

### Phase 6 — Email features
Build: (a) **Weekly open-house digest**: weekly Inngest cron emailing users who have saved
searches with alerts enabled a digest of upcoming open houses matching their saved-search areas;
reuse alert-suppression + absolute-image-URL email patterns; skip send when zero matches (demo
reality). (b) **Listing recommendations in campaign emails**: heuristic ranker
(`src/lib/recommendations.ts`): score listings for a contact from favorites/recently-viewed/saved
searches (price band, city, beds, features overlap), pure + unit-tested; merge tag/section in the
existing campaign email pipeline inserting top-3 with photos + attribution; AI re-rank hook gated
on `OPENAI_API_KEY` presence (off now).
EXIT CRITERIA: digest job unit tests incl. zero-match skip + suppression pass; ranker unit tests
(deterministic ordering) pass; full verify suite exit 0.

### Phase 7 — Match score + auto-tagging (AI-ready, key-gated)
Build: (a) **Property match score**: heuristic 0–100 for logged-in users vs their saved
searches/favorites (reuse Phase 6 ranker), badge on listing cards when logged in; embedding
similarity term activates only when embeddings exist. (b) **Auto-tagging**: at sync, rule-based
tags into an additive `tags String[]` on Listing (pool, waterfront, new-construction, gated,
golf/55+/waterview from CommunityFeatures, era buckets from yearBuilt); tag chips on detail page;
optional AI styling-tag pass gated on `OPENAI_API_KEY`. Tags filterable in search.
EXIT CRITERIA: scoring + tagging unit tests pass (mocked AI never called when key absent —
asserted); sync still green (run one incremental sync locally, SyncState idle, no error — shown);
full verify suite exit 0.

### Phase 8 — Ship
`/git-workflow-planning:finish` → PR → squash to develop → promote main. Verify production
deployment READY (get_project → get_deployment, sha matching). chrome-devtools smoke on
production: /properties (open-house + tag filters present), one detail page (price history, TCO,
RSVP form, tags), compare page, agent dashboard panels behind login left to Rob (note it).
Update `homewisebrain/STATE.md` + journal. Roadmap file updated for all phases.
EXIT CRITERIA: PR merged; develop==main; prod deployment READY evidenced; smoke evidence
(screenshot/innerText) surfaced for the public pages; honest list of anything deferred.

## HARD CONSTRAINTS
- TypeScript strict, no `any`. Zod at every new API boundary. Source files ≤450 LOC (split).
- Additive-only schema changes, applied with `npm run db:push`. Never `migrate dev`. Never destructive SQL.
- IDX compliance must not regress: MLS rows always filtered by `mlgCanUse has "IDX"` on public
  reads; attribution/disclaimer components on every new public listing surface.
- BO-gated features (`ANALYTICS_BO_ENABLED`) untouched and still gated.
- Never delete files (archive/ instead). Never commit `.env.local`. No new heavyweight deps
  without checking an existing equivalent first.
- All existing tests stay green at every checkpoint. chrome-devtools MCP only for browser work.
- Sold-price data must not be displayed in any NEW surface (IDX restriction; existing gated code only).

## DEFINITION OF DONE
All Phase 1–8 EXIT CRITERIA evidenced in-transcript; full verify suite (type-check, lint, vitest,
build) exit 0 on the final commit; develop and main both deployed READY on the same sha; blockers
(if any) documented in `docs/temp/mls-native-suite-blockers.md` with what Rob must do.
