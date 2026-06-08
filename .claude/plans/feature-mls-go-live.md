# MLS Go-Live Implementation Plan (v2 — audit-corrected)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the seed-data MLS foundation into a live, **compliant** Stellar MLS IDX integration — full site-wide property search, HomeWise-brokerage listings as featured, and every existing MLS-dependent feature wired correctly (or explicitly gated when it needs a license tier we don't yet hold).

**Architecture:** Replication. An Inngest cron pulls the full Stellar feed from MLS Grid (RESO Web API) into the Prisma `Listing` table; all public surfaces read from that table through a single IDX-visibility filter. Photos are served via an on-demand caching proxy (hotlinking is forbidden). Sold-data analytics (CMA/AVM/market stats) are feature-gated OFF until the Back Office license is provisioned.

**Tech Stack:** Next.js (App Router), Prisma + Supabase Postgres (pooler) + pgvector, Inngest, Supabase Storage, Vitest.

> **v2 note:** This supersedes the pre-audit v1 (archived at `archive/plans/feature-mls-go-live-v1-preaudit.md`). A 22-agent verification workflow (2026-06-08) audited v1 against 112 extracted requirements and returned **NO_GO** with 8 blocking defects. v2 closes them. Verified-correct from v1 and carried forward unchanged in substance: static-token auth, `OriginatingSystemName` filter, `@odata.nextLink` paging, `MlgCanView` deletes, the HMAC image proxy with `User-Agent: <token>`, OpenHouse-as-separate-resource, and the featured-office helper.

---

## Decisions locked

| Decision | Choice | Mechanism |
|---|---|---|
| Search scope | **Full IDX feed** | `MLS_OFFICE_ID` unset |
| Featured | **HomeWise office listings** | `HOMEWISE_OFFICE_MLS_ID` (comma-sep) → `featured=true` at upsert |
| Auth | **Static portal bearer token** | `MLS_GRID_TOKEN` |
| Required filter | `OriginatingSystemName` every query | `MLS_GRID_ORIGINATING_SYSTEM_NAME` |
| Off-market | **Delete locally + purge cached photos** | incremental query omits `MlgCanView` filter |
| Public visibility | Only `IDX` in `MlgCanUse`, applied to **every** read path | central `withIdx()` helper + GIN index |
| Media | On-demand caching proxy, `User-Agent:<token>` download | `/api/mls-photo` |
| Open houses | Separate `OpenHouse` resource, own cursor, every cycle | not `$expand` |
| **Sold-data analytics (CMA/AVM/market stats)** | **CONFIRMED: skip Back Office for now — gated OFF** (Rob, 2026-06-08) | `ANALYTICS_BO_ENABLED=false` ships at launch; flip to `true` only after the BO license + feed are provisioned later |
| Identity key | **`ListingKey`** (immutable) for all upsert/delete/lookup | `ListingId` stored as a separate searchable column |

> ⚠️ **COMPLIANCE — read first.** IDX data may **not** lawfully power CMA, AVM/home-valuation, or sold-comp market analytics (Stellar Article 19.05); those need the paid **Back Office** feed (~$450/office/yr, separate three-party agreement). **Decision (Rob, 2026-06-08): skip Back Office for launch** — Phase 8 ships those features gated OFF; everything else (full IDX search, featured listings, detail, agent portfolios, alerts, chatbot) launches now. The BO feed can be added later by provisioning it and flipping `ANALYTICS_BO_ENABLED=true`. Public IDX displays also carry mandatory attribution (Articles 19.22/19.23/19.09) — Phase 7.

> ⚠️ **DB note:** Schema goes out with `npm run db:push` (never `migrate dev`) per `[[skill-supabase-prisma-db-push]]`. The Supabase project is **shared with production** — `db:push` and the backfill write to prod. New columns are additive; pgvector + GIN indexes are created via `db:push`/raw SQL in Phase 9. Phase 10 does a **branch/sample dry-run first** and keeps public reads flag-gated until counts verify.

> ⚠️ **Prerequisite (blocks Phases 9–10 go-live only):** approved MLS Grid token + the exact `OriginatingSystemName` + a Stellar sample data set. Phases 1–8 build and unit-test without it.

---

## Build order (fixes v1 Gap #8: helpers before the sync that imports them)

1. Config + schema + RESO types + auth/query builder
2. Pure helpers (`mls-featured`, `mls-image`, `mls-visibility`)
3. Image proxy route
4. Sync engine (imports helpers from 2–3)
5. OpenHouse sync
6. Universal IDX read filter across all surfaces
7. Compliance / attribution
8. Sold-analytics BO-gating
9. Scale (pgvector, polygon bbox, rate budgets, GIN)
10. Backfill + go-live verification

Each Rule 9 checkpoint must be green (`npm run type-check && npm run lint && npx vitest run`).

---

## File structure

**Create**
- `src/lib/mls-featured.ts` (+ `.test.ts`) — office-match featured helper
- `src/lib/mls-image.ts` (+ `.test.ts`) — signed proxy URL builder
- `src/lib/mls-visibility.ts` (+ `.test.ts`) — `withIdx()` central IDX filter
- `src/app/api/mls-photo/route.ts` — caching image proxy
- `src/lib/mls-grid.test.ts` — query-builder tests
- `src/inngest/functions/mls-sync.test.ts` — mapping/compliance/event tests
- `src/components/properties/listing-attribution.tsx` — per-card brokerage/listing#/status
- `src/components/properties/mls-grid-source-line.tsx` — "as distributed by MLS GRID" + logo + exclusion disclosure
- `src/lib/analytics-flags.ts` (+ `.test.ts`) — `analyticsBoEnabled()`

**Modify**
- `prisma/schema.prisma` — Listing: `mlgCanUse`, `photoSources`, `photosChangeTimestamp`, `listingId`, `elementarySchoolDistrict`, `middleSchoolDistrict`, `highSchoolDistrict`; GIN index on `mlgCanUse`; pgvector on `embedding`; SyncState `cursor`
- `src/types/reso.ts` — add `MlgCanView/MlgCanUse/OriginatingSystemName/PhotosChangeTimestamp/MediaKey`, **replace `SchoolDistrict` with the real district fields**, generic `ResoODataResponse<T>`, OpenHouse query fields
- `src/lib/mls-grid.ts` — static-token auth, query/OpenHouse builders, throttle, 429 backoff
- `src/inngest/functions/mls-sync.ts` — cursor sync, ListingKey keying, MlgCanView delete+purge, MlgCanUse, featured, proxy photos, **emit `mls/listing.price-changed` + `mls/listing.synced`**, real school-district mapping, status allowlist, cron-skip-during-backfill, zero-row-initial = error
- All public read paths (Phase 6 lists every file) — apply `withIdx()`
- Card components + listing pages — attribution (Phase 7)
- Sold-analytics consumers — BO gate (Phase 8)
- `src/providers/stellar-mls-provider.ts` — `withIdx()` base, polygon bbox prefilter, drop `embedding` from list selects, pgvector query
- `.env.example` — all new vars

---

## Phase 1 — Config, schema, RESO types, auth

### Task 1.1: Env vars

- [x] **Step 1: Add to `.env.example`:**

```
# --- MLS Grid (Stellar MLS, RESO Web API) ---
MLS_GRID_TOKEN=
MLS_GRID_BASE_URL=https://api.mlsgrid.com/v2
MLS_GRID_ORIGINATING_SYSTEM_NAME=
MLS_OFFICE_ID=                 # unset = full site-wide IDX feed
HOMEWISE_OFFICE_MLS_ID=        # comma-separated office id(s) → featured
MLS_IMAGE_SIGNING_SECRET=      # HMAC for the image proxy
ANALYTICS_BO_ENABLED=false     # true ONLY when Back Office feed is licensed
# SUPABASE_SERVICE_ROLE_KEY already present (used by src/lib/supabase/admin.ts)
```

- [x] **Step 2: Commit.** `git add .env.example && git commit -m "docs(mls): env vars for go-live"`

### Task 1.2: RESO types (fixes Gap #5 + generic envelope)

- [x] **Step 1:** In `src/types/reso.ts`, in `ResoProperty` after `ModificationTimestamp`:

```ts
  ModificationTimestamp: string;
  OriginatingSystemName?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  PhotosChangeTimestamp?: string;
```

- [x] **Step 2:** **Replace** the bogus `SchoolDistrict?: string;` line with the real RESO district fields:

```ts
  ElementarySchoolDistrict?: string;
  MiddleOrJuniorSchoolDistrict?: string;
  HighSchoolDistrict?: string;
```

- [x] **Step 3:** Extend `ResoMedia` (`MediaKey?`, `MediaModificationTimestamp?`) and `ResoOpenHouse` (`OpenHouseKey?`, `ListingId?`, `ModificationTimestamp?`, `MlgCanView?`).

- [x] **Step 4:** Make the envelope generic:

```ts
export interface ResoODataResponse<T = ResoProperty> {
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}
```

- [x] **Step 5:** `npm run type-check` → expect errors only in `mls-sync.ts` (fixed Phase 4). Commit: `git add src/types/reso.ts && git commit -m "feat(mls): RESO compliance fields + real school-district fields"`

### Task 1.3: Schema columns + indexes (fixes Gaps #5, #7, #9-index)

- [x] **Step 1:** In `prisma/schema.prisma` `Listing`, add:

```prisma
  listingId             String?
  mlgCanUse             String[]  @default([])
  photoSources          String[]  @default([])
  photosChangeTimestamp DateTime?
  elementarySchoolDistrict String?
  middleSchoolDistrict     String?
  highSchoolDistrict       String?
```

Add indexes in the model's index block:

```prisma
  @@index([listingId])
  @@index([mlgCanUse], type: Gin)
```

> `mlsId` now stores **`ListingKey`** (Task 4). `listingId` holds the human `ListingId`.

- [x] **Step 2:** In `SyncState`, add `cursor String?` (cross-run high-water mark).

- [x] **Step 3:** `npm run db:push` (writes to shared/prod; additive). If Prisma rejects `type: Gin` on `String[]`, create it via raw SQL instead: `CREATE INDEX IF NOT EXISTS listing_mlgcanuse_gin ON "Listing" USING GIN ("mlgCanUse");` and drop the `@@index` line.

- [x] **Step 4:** `npm run prisma:generate && npm run type-check`. Commit: `git add prisma/schema.prisma && git commit -m "feat(mls): listing compliance/identity columns + GIN index"`

### Task 1.4: Static-token auth + query builders (TDD)

*(Unchanged from v1 except retained here for build order. See v1 archive for the full test list.)*

- [x] **Step 1:** Create `src/lib/mls-grid.test.ts` asserting: `hasCredentials()` true with token+originating system; `buildPropertyUrl({})` contains `OriginatingSystemName eq '<X>'` and `%24expand=Media` and NOT `OpenHouse`; `initialImport` adds `MlgCanView eq true`; `modifiedAfter` adds `ModificationTimestamp ge` (note: **`ge`**, see Gap #6); `MLS_OFFICE_ID` adds `ListOfficeMlsId eq`; `buildOpenHouseUrl({modifiedAfter})` hits `/OpenHouse` with originating system + cursor.

- [x] **Step 2:** `npx vitest run src/lib/mls-grid.test.ts` → FAIL.

- [x] **Step 3:** Rewrite `src/lib/mls-grid.ts`: static `token()`/`originatingSystem()` from env; `hasCredentials()`; `buildPropertyUrl({modifiedAfter,initialImport,top})` with filter `OriginatingSystemName eq '…'` [+ `MlgCanView eq true` if initial] [+ `ModificationTimestamp ge <cursor>` if modifiedAfter] [+ `ListOfficeMlsId eq` if `MLS_OFFICE_ID`], `$expand=Media`, `$orderby=ModificationTimestamp,ListingKey`, `$top`; `buildOpenHouseUrl({modifiedAfter,top})` on `/OpenHouse`; `authedFetch(url)` with `Authorization: Bearer` **and 429/`RateLimit-Reset` backoff** (read header, sleep, one retry); `fetchPage`/`fetchOpenHousePage` (the latter typed `ResoODataResponse<ResoOpenHouse>`).

```ts
async function authedFetch(url: string): Promise<ResoODataResponse> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.status === 429 && attempt === 0) {
      const reset = Number(res.headers.get("RateLimit-Reset") ?? "2");
      await new Promise((r) => setTimeout(r, Math.min(reset, 30) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`MLS Grid fetch error: ${res.status} ${await res.text()}`);
    return (await res.json()) as ResoODataResponse;
  }
  throw new Error("MLS Grid: rate-limited after retry");
}
```

- [x] **Step 4:** `npx vitest run src/lib/mls-grid.test.ts` → PASS. Commit.

---

## Phase 2 — Pure helpers (built BEFORE the sync)

### Task 2.1: `mls-featured` (TDD)
- [x] `parseOfficeIds(raw)` → trimmed non-empty list; `isHomewiseOffice(id)` → membership in `HOMEWISE_OFFICE_MLS_ID`. Tests for comma-parse, null, no-config=false. Implement, run, commit. *(Same as v1 Phase 3.)*

### Task 2.2: `mls-image` (TDD)
- [x] `storageKeyFor(url)`=sha256 hex+`.jpg`; `proxyPhotoUrl(url)`=`/api/mls-photo?u=<b64url>&sig=<hmac>`; `parseAndVerify(params)` HMAC `timingSafeEqual`. Tests: builds under `/api/mls-photo`, round-trips, rejects tampered sig, deterministic key. Implement, run, commit. *(Same as v1 Phase 4.1.)*

### Task 2.3: `mls-visibility` (TDD — fixes Gap #1 foundation)
- [x] **Step 1:** Failing test `src/lib/mls-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IDX_WHERE, withIdx } from "./mls-visibility";
it("exposes the IDX clause", () => { expect(IDX_WHERE).toEqual({ mlgCanUse: { has: "IDX" } }); });
it("merges into an existing where", () => {
  expect(withIdx({ city: "Tampa" })).toEqual({ city: "Tampa", mlgCanUse: { has: "IDX" } });
});
it("merges into empty", () => { expect(withIdx()).toEqual({ mlgCanUse: { has: "IDX" } }); });
```

- [x] **Step 2:** Implement `src/lib/mls-visibility.ts`:

```ts
import type { Prisma } from "@prisma/client";
export const IDX_WHERE = { mlgCanUse: { has: "IDX" } } as const;
export function withIdx(where: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return { ...where, mlgCanUse: { has: "IDX" } };
}
```

- [x] **Step 3:** Run → PASS. Commit: `git add src/lib/mls-visibility.* && git commit -m "feat(mls): central IDX visibility filter"`

---

## Phase 3 — Caching image proxy

### Task 3.1: Bucket + route (fixes Gap #12)
- [x] **Step 1 (non-code):** Create public Supabase Storage bucket `mls-photos`.
- [x] **Step 2:** Implement `src/app/api/mls-photo/route.ts` using the **existing** `src/lib/supabase/admin.ts` client (not raw `createClient`): `parseAndVerify` → 400 on bad sig; compute `storageKeyFor`; HEAD the public URL, 302 if cached; else `fetch(source, { headers: { "User-Agent": process.env.MLS_GRID_TOKEN ?? "" } })` (required since 2026-06-01), upload to `mls-photos` with year-long cache-control, stream bytes back. Export `export const dynamic = "force-dynamic";`.
- [x] **Step 3:** `npm run type-check`. Manual smoke per `[[skill-testing-mock-manual-smoke]]`: hit a signed URL for a public image, confirm stream then 302-on-reload. Document URL tried. Commit.
  - Smoke source URL: `https://picsum.photos/seed/homewise-mls/64/64.jpg`; first request `200 image/jpeg`, second request `302` to Supabase `mls-photos`.

---

## Phase 4 — Compliant sync engine

### Task 4.1: Mapping + compliance + event tests (TDD)
- [x] **Step 1:** `src/inngest/functions/mls-sync.test.ts` asserting on exported `mapResoToListingData(reso)`: `Closed→Sold`; `mlgCanUse` stored; raw urls in `photoSources`, `photos[0]` contains `/api/mls-photo`; `featured` true when office in `HOMEWISE_OFFICE_MLS_ID`; **`mlsId === reso.ListingKey`** and `listingId === reso.ListingId`; school districts mapped from `ElementarySchoolDistrict`/`MiddleOrJuniorSchoolDistrict`/`HighSchoolDistrict`. Plus a `detectPriceChange(prev, next)` unit test (returns true when `ListPrice` differs).
- [x] **Step 2:** Run → FAIL.

### Task 4.2: Rewrite sync (fixes Gaps #3, #5, #6, #7, #11, #13, #14)
- [x] **Step 1:** Rewrite `src/inngest/functions/mls-sync.ts`. Key changes vs v1:
  - **Identity:** `const key = reso.ListingKey;` used for `upsert where {mlsId:key}`, deletes, and `listingId: reso.ListingId` stored separately.
  - **Cursor (Gap #6):** persist `cursor = maxSeenTs` to `SyncState` on **every** processed page (not just done); carry `cursor` + `nextLink` in the continuation event; resume `modifiedAfter` from `SyncState.cursor`; filter uses **`ge`** with idempotent upsert (boundary-safe).
  - **Cron re-entry guard (Gap #13):** if invoked by cron while `SyncState.status === "syncing"`, return early `{skipped:"backfill-in-flight"}`.
  - **Zero-row initial = error (Gap #11):** if `initialImport` and the first page returns 0 rows, throw (wrong `OriginatingSystemName`), do not mark success.
  - **MlgCanView delete + image purge (Gap #12):** on `MlgCanView===false`, delete the row AND delete its cached objects from `mls-photos` (map `photoSources`→`storageKeyFor`).
  - **Events (Gap #3):** in `upsertListing`, read the existing row first; if `!initialImport` and `ListPrice` changed, `inngest.send({name:"mls/listing.price-changed", data:{listingId:key, oldPrice, newPrice}})`; and `inngest.send({name:"mls/listing.synced", data:{listingId:key}})`. **Suppress per-record events during `initialImport`** (backfill emits one bulk `mls/listing.backfilled` at completion for the embedding job).
  - **Status allowlist (Gap #14):** `mapStatus` confirmed against feed metadata; public-facing terminal statuses constrained in Phase 6 reads.
  - `mapResoToListingData` exported; school districts from the real fields; `featured` via `isHomewiseOffice`; `photos` via `proxyPhotoUrl`.
- [x] **Step 2:** `npx vitest run src/inngest/functions/mls-sync.test.ts` → PASS. `npm run type-check` (whole repo now green). Commit.

> **450-LOC watch (Gap from process lens):** if `mls-sync.ts` exceeds 450 lines, extract `mapResoToListingData` + `upsertListing` into `src/inngest/functions/mls-sync.mapper.ts`.

---

## Phase 5 — OpenHouse sync (own cursor, every cycle) — fixes Gap #10

- [x] **Step 1:** Add `syncOpenHouses(cursor)` to `mls-sync.ts` (or `mls-openhouse.ts` if LOC): page `fetchOpenHousePage` by its **own** `ge` cursor (store `SyncState` provider row `stellar-openhouse`); skip `MlgCanView===false`; group slots by `ListingId`; parse `OpenHouseDate`+`OpenHouseStartTime`/`EndTime` as **full datetimes**; `updateMany` the schedule onto matching `listingId`; **clear** schedules for listings whose open houses are gone/expired (set `openHouseSchedule = JsonNull` where last slot < now). Throttle (`step.sleep` 600ms/page).
- [x] **Step 2:** Call it every incremental cycle (not only at backfill completion). Type-check, commit.

---

## Phase 6 — Universal IDX read filter (fixes BLOCKING Gap #1)

Apply `withIdx()` / `IDX_WHERE` to **every** path that reads `prisma.listing` for any public/user-facing or public-content output. Verified consumer list:

- [x] **Step 1 — provider:** `src/providers/stellar-mls-provider.ts` `search()` base `const where = withIdx();`; `getProperty()` add `mlgCanUse: { has: "IDX" }`.
- [x] **Step 2 — widgets/homepage:** `featured-listings-widget.tsx`, `agent-listings-widget.tsx` (all 4 queries), `src/app/(marketing)/page.tsx:18`.
- [x] **Step 3 — pages:** `src/app/(marketing)/agents/[slug]/listings/page.tsx`; `src/app/sitemap.ts`.
- [x] **Step 4 — chatbots:** `src/lib/chatbot/public-site.ts`, `src/lib/chatbot/agent-website.ts`.
- [x] **Step 5 — search/AI public:** `src/lib/ai/embeddings.ts` (`semanticSearch`), `src/inngest/functions/generate-embeddings.ts`, `src/inngest/functions/seo-content-generator.ts`.
- [x] **Step 6 — alerts:** `src/inngest/functions/listing-alerts.ts`, `src/inngest/functions/smart-alerts.ts`, `src/inngest/functions/price-change-alerts.ts` (alerts must not notify on non-IDX rows).
- [x] **Step 7 — favorites/saved:** any favorites/saved-search read API that returns listing data publicly.
- [x] **Step 8 — test (Gap #1 fix proof):** add `src/lib/mls-visibility.integration.test.ts` (mock prisma) seeding one `IDX` and one non-`IDX` row and asserting each surface’s query carries the `mlgCanUse has "IDX"` clause. Run, type-check, lint. Commit: `feat(mls): enforce IDX visibility on all read paths`.

> Note: agent-only CRM/transaction tools (listing-description/insights/social-post over the agent's **own active** listings) are IDX-permitted, but still read through `withIdx()` so opted-out records never surface.

---

## Phase 7 — Compliance & attribution (fixes BLOCKING Gap #4)

Stellar Articles 19.22/19.23/19.09 + MLS GRID source/disclaimer.

- [x] **Step 1:** `src/components/properties/listing-attribution.tsx` — renders **listing brokerage name + listing number (`listingId`) + status** adjacent to each listing. Add to every card/grid/map-list: the property card on `/properties`, `ListingCardSmall` (both widgets), detail page, agent listings.
- [x] **Step 2:** `src/components/properties/mls-grid-source-line.tsx` — "as distributed by MLS GRID" + MLS GRID logo, rendered on the first page listings appear (search results + homepage featured); plus the always-on **"Some IDX listings have been excluded from this website."** disclosure (the IDX filter is an objective limitation) and a **sold-listing disclaimer** wherever solds render.
- [x] **Step 3:** Keep existing `IdxDisclaimer` on `/properties`, `/properties/[id]`, `/agents/[slug]/listings`; add per-listing "Courtesy of {listingOfficeName} — {listingAgentName}" on the detail sidebar.
- [x] **Step 4:** Chatbot output that names a listing must include brokerage attribution (pass `listingOfficeName` into the answer template in both chatbot libs).
- [x] **Step 5:** type-check, lint, commit.

> ⚠️ **Verify-with-sample (Gap, req 52):** confirm whether `ListAgentDirectPhone`/`ListAgentEmail` are delivered/public in the IDX feed before displaying them (Article 19.19). If confidential, suppress. Direct listing-agent contact fields are currently suppressed until this sample verification is complete.

---

## Phase 8 — Sold-analytics BO-gating (fixes BLOCKING Gap #2)

- [x] **Step 1:** `src/lib/analytics-flags.ts` → `analyticsBoEnabled()` reads `ANALYTICS_BO_ENABLED === "true"`. Unit test both states.
- [x] **Step 2:** Gate every sold-comp/analytics consumer so that when BO is **off** it returns a clear "market analytics unavailable" state instead of computing over IDX data: `src/app/api/ai/cma/route.ts`, `src/app/api/ai/home-valuation/route.ts`, `src/app/api/ai/market-insights/route.ts`, `src/app/api/ai/meeting-prep/route.ts`, `src/inngest/functions/market-stats-aggregation.ts`, and the public `src/app/(marketing)/market/[city]/page.tsx` + `home-evaluation/page.tsx`.
- [x] **Step 3:** When BO is later licensed, these route their reads to `{ mlgCanUse: { has: "BO" } }` (a `withBo()` sibling helper) and public pages must keep BO-derived sold output **behind login** (VOW/BO rule). Document this in each gated file.
- [x] **Step 4:** type-check, lint, commit: `feat(mls): gate sold-data analytics behind Back Office license flag`.

---

## Phase 9 — Scale (fixes BLOCKING Gap #9)

- [x] **Step 1 — polygon bbox prefilter:** in `stellar-mls-provider.ts` `filterByPolygon`, compute the polygon's bounding box, query the DB with `latitude/longitude between` + `withIdx()` (and current filters), then ray-cast only that reduced set. No more full-table scan.
- [ ] **Step 2 — pgvector:** enable extension + index via raw SQL in a one-time setup step: `CREATE EXTENSION IF NOT EXISTS vector;`, change `Listing.embedding` to `Unsupported("vector(1536)")` in schema (or keep `Float[]` + a parallel `vector` column), `db:push`, then `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);`. Rewrite `semanticSearch` to `ORDER BY embedding <=> $query LIMIT k` via `$queryRaw` with the IDX clause — **stop** `SELECT`ing `embedding` on list reads (`select`/`omit` it in `stellar-mls-provider` and widgets).
- [x] **Step 3 — embedding backfill:** on `mls/listing.backfilled`, enqueue embeddings in bounded batches (respect provider rate/cost); incremental `mls/listing.synced` embeds single rows.
- [x] **Step 4 — media budget:** in the proxy + sync, add a daily-records / 4GB-hr guard and concurrency cap so on-demand downloads + sync stay within `2 req/s, 7200/hr, 4GB/hr, 40k/24h`.
- [ ] **Step 5:** type-check, lint, vitest, commit.

> Phase 9 pgvector code/schema/SQL are prepared in `prisma/mls-pgvector.sql`, but the shared/prod SQL execution and `db:push` are pending explicit approval for this specific production schema change.

---

## Phase 10 — Backfill + go-live verification (fixes Gaps #15, #17, #18)

- [ ] **Step 1 — typing (Gap #18):** add Inngest `EventSchemas` for `mls-sync`, `mls/listing.price-changed`, `mls/listing.synced`, `mls/listing.backfilled`; normalize `listingAgentMlsId` vs `Agent.mlsAgentId` (trim/upper) + a backfill check that warns on agents with zero matched listings.
- [ ] **Step 2 — prod env:** set all vars in Vercel Production (`MLS_OFFICE_ID` unset, `ANALYTICS_BO_ENABLED=false`); confirm Inngest prod app registered.
- [ ] **Step 3 — safe dry-run (Gap #17):** run the sample/branch import first (Supabase branch or temporary `MLS_OFFICE_ID` scope); snapshot before the full backfill; keep public reads behind a launch flag until counts verify.
- [ ] **Step 4 — alert suppression (Gap #15):** suppress `daily-listing-alerts` + price-change alerts for the backfill window (don't notify on `createdAt≈now` whole-feed); make alert email image URLs absolute.
- [ ] **Step 5 — full backfill:** trigger `POST /api/admin/sync` (route + `sync-dashboard.tsx` already exist); watch `SyncState` syncing→idle, `cursor` advancing.
- [ ] **Step 6 — verify counts:** total>0, `mlgCanUse has IDX`>0, featured = HomeWise count, agent portfolios populated.
- [ ] **Step 7 — E2E smoke (chrome-devtools, Rule 4):** search/map/polygon/filters; detail photos+attribution+disclaimer; homepage featured = HomeWise only; agent listings; a non-IDX row is invisible everywhere; analytics surfaces show the BO-gated state. Monitor Vercel deploy green per `[[skill-build-vercel-monitor]]`.
- [ ] **Step 8 — compliance/freshness:** off-market record deletes + its cached photos purge within the 12h window; 15-min cron advances `cursor` and pulls only changed rows.

---

## Cannot be verified without the live token / sample data
- Exact `OriginatingSystemName` (likely `MFRMLS`) — wrong value returns zero rows silently (Phase 4 zero-row guard catches it).
- Whether the IDX feed delivers Closed/Sold + `ClosePrice`/`CloseDate` at all (Article 19.27) — determines if any sold/recently-sold/price-history path renders (reqs 11/27/34/50/62).
- Whether `MlgCanView=false` flips bump `ModificationTimestamp` (required for the incremental delete path to see them).
- `StandardStatus` lookup spelling (`ComingSoon` vs `Coming Soon`).
- `$expand=Media` row ceiling / Media truncation at `$top`.
- Whether `ListAgentDirectPhone`/`ListAgentEmail` are public (Article 19.19).
- `ListAgentMlsId` format vs hand-entered `Agent.mlsAgentId` (leading zeros/prefixes).
- Real backfill wall-clock vs the 40k-records/24h cap (validates `PAGES_PER_RUN`).
- That the token authenticates and media downloads succeed with `User-Agent:<token>`.

## Self-review (v2)
- **Blocking gaps closed:** #1 universal `withIdx()` (Phase 6) ✓; #2 BO-gating (Phase 8) ✓; #3 events emitted (Phase 4) ✓; #4 attribution (Phase 7) ✓; #5 real school fields (Tasks 1.2/1.3/4.2) ✓; #6 cursor persist+`ge`+carry (Phase 4) ✓; #7 `ListingKey` identity (Phase 4) ✓; #8 build order (helpers Phase 2–3 before sync Phase 4) ✓; #9 polygon bbox + pgvector + GIN + drop embedding select (Phases 1.3/9) ✓.
- **Nice-to-haves folded in:** #10 OpenHouse cycle/clear/datetime (Phase 5); #11 zero-row guard, #12 image purge + admin client + 429, #13 cron re-entry guard, #14 status spelling, #15 alert suppression + absolute URLs (Phase 10), #16 admin sync **already exists** (verified), #17 dry-run/snapshot/flag, #18 event typing + agent-id normalization (Phase 10).
- **Type consistency:** `withIdx`/`IDX_WHERE` (2.3) used Phase 6; `proxyPhotoUrl`/`storageKeyFor`/`parseAndVerify` (2.2) used Phase 3 route + Phase 4 mapper + purge; `isHomewiseOffice` (2.1) used Phase 4; `buildPropertyUrl`/`buildOpenHouseUrl`/`fetchPage`/`fetchOpenHousePage` (1.4) used Phases 4–5; `analyticsBoEnabled` (8.1) used Phase 8.
- **Scope honesty:** ~24 not_covered requirements are idea-stage (`docs/ideas/*`) and ~8 need VOW/BO tiers — explicitly out of scope for IDX go-live, gated not silently dropped.
</content>
