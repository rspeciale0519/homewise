# SPEC: Browser E2E Smoke — MLS Feature Suite (no-email scope)

> **STATUS: ✅ COMPLETE (2026-06-12).** All phases A–J PASS; full results table in
> `docs/temp/e2e-smoke-results.md`. Six real defects found and fixed (PR #57, squash
> `726ecb7`, develop = main, prod deployment dpl_DZaejR3LkgneCbV9Mppx45upAHL7 READY):
> type filter dead vs RESO values, mock-era status options, no Save Search UI,
> useTrackView never mounted, raw-cuid favorites/recently-viewed cards, exclusive-edit
> 400 on null optional strings. No email actions executed anywhere.

## GOAL
Thoroughly smoke-test, in a real browser via chrome-devtools MCP, every feature on the
2026-06-12 checklist EXCEPT anything that sends or receives email. Fix any failure found
(code or data), re-test, and repeat until 100% of in-scope tests pass with in-transcript
evidence (screenshot description, innerText assertion, or DB check per test).

## EXCLUDED (email scope — do NOT execute)
- Open House RSVP **submission** (the API sends a notification email). Test the form render,
  slot dropdown, and client-side validation only — never click the final submit.
- Weekly open-house digest, campaign/drip recommendation emails, listing/price alerts
  email delivery, property-alert signup confirmation sends. (UI toggles that merely save
  state ARE in scope.)

## CURRENT STATE (do not rediscover)
- chrome-devtools MCP REQUIRED (Rule 4; never Playwright). If its tools are unavailable,
  STOP immediately and write the blocker to docs/temp/e2e-smoke-blockers.md — it only
  reconnects with a fresh session.
- Local app: `127.0.0.1:3100` (ports 3000–3005 are hijacked by stale portproxy). Start dev:
  `$env:INNGEST_DEV='1'; npm run dev -- -H 127.0.0.1 -p 3100` (background), then re-register
  Inngest: `PUT http://127.0.0.1:3100/api/inngest`. Inngest dev server runs on 8288; start
  with `npx --yes inngest-cli@latest dev -u http://127.0.0.1:3100/api/inngest` if down.
- Local and production (app.homewisefl.com) share ONE Supabase DB (12,793 MLS demo listings
  + manual listings). Prod now runs PROPERTY_PROVIDER=stellar + MLS_PUBLIC_SEARCH_ENABLED=true.
- Test data already present: listing `cmq8hv1bv03w2lbb0rxucbrk2` (117 Dinner Lake Ave) has
  seeded price history + a future open house (2026-06-20); exclusive listing
  `cmqb3ui5c0000lboccp0za60y` (742 Hidden Grove Ln, Winter Garden, manualStatus=approved);
  agent Maria Alvarez (slug maria-alvarez, mlsAgentId MFR260504162, agent id
  cmm7uh74h0000lbciesmyfe3e); CRM contact test-buyer@example.com with prefs + 1 match row.
- Logins: look for seeded credentials in `tests/e2e/fixtures/` (seed script
  `npx tsx tests/e2e/fixtures/seed-e2e.ts` exists per CLAUDE.md). If a needed role has no
  working account, create clearly-labeled test users (e2e-buyer@/e2e-agent@/e2e-admin@
  example.com) via Supabase admin client + UserProfile role + (for agent) link an Agent row;
  document them in docs/temp/e2e-smoke-accounts.md. Never touch real users. Agent invite
  code env: AGENT_INVITE_CODE.
- Demo-data caveats that define "pass" (do NOT chase as failures): photos may 429 on first
  view (demo media rate limit) — a photo test PASSES if the /api/mls-photo response is 200,
  302, or 429-with-Retry-After and at least one photo on the page renders; school RATINGS
  may be empty (no key) — the schools section rendering at all is the pass; open-house data
  is sparse — use the seeded listing; match-score badges need behavior first (favorite 2–3
  homes as the buyer, then search).
- Verify suite commands: type-check/lint/`npx vitest run`/build. Schema changes forbidden.
- If a CODE fix is required: branch via /git-workflow-planning:start test e2e-browser-smoke,
  checkpoint fixes, finish + squash to develop + promote main (no-pause memory), verify the
  prod deployment READY via get_project→get_deployment before re-testing prod.

## TEST PHASES (each test → PASS evidence in transcript; on FAIL → diagnose, fix, re-run)

### Phase A — Preflight
chrome-devtools tools callable (open a page); local dev stack up + Inngest registered;
logins resolved for buyer/agent/admin (document source).
EXIT: all three logins succeed in the browser (dashboard/admin page reachable per role).

### Phase B — Public search & filters (checklist 1–7)
B1 home-page hero search (city + price + beds) lands on /properties with >0 results shown.
B2 /properties: results count visible, pagination next/prev, each sort option changes order
   (verify first card price/DOM changes appropriately for price_asc vs price_desc).
B3 core filters: price preset, beds, baths, type, status each narrow the count.
B4 advanced filters: minYear, maxHoa, maxDom, schoolDistrict (empty result acceptable —
   demo has no school districts; control = count changes or zero), each amenity checkbox.
B5 Open Houses Only → returns ≥1 (seeded listing present).
B6 commute filter: "400 W Church St, Orlando" + 15 min → count drops vs unfiltered; Clear
   restores.
B7 map: split/list/map toggles, pins render, polygon Draw narrows results.
EXIT: every sub-test PASS with counts/screenshots cited.

### Phase C — Listing detail (checklist 8, 9, 13 + tags)
On seeded listing cmq8hv1bv…: gallery opens (View all N), stats bar, Price History chart
(svg + delta text), TCO panel incl. HOA row + estimate footnote, location map, walk-score,
schools section, tag chips render and clicking one filters /properties, attribution +
IDX disclaimer present. RSVP: form opens, slot dropdown shows 2026-06-20, required-field
validation blocks empty submit — DO NOT complete a valid submission (email).
EXIT: each element evidenced.

### Phase D — Compare + Exclusive (checklist 10, 12)
D1 compare: toggle 3 cards → floating bar shows 3 → Compare page table renders rows
   ($/sqft, HOA, scores) → Clear empties bar. Max-4 enforcement (5th toggle disabled).
D2 exclusive listing: appears in search (location=742 Hidden Grove) with Exclusive badge;
   detail shows badge, attribution without MANUAL-id.
EXIT: evidenced.

### Phase E — Agents (checklist 14, 15)
Agent directory renders; maria-alvarez profile shows MLS ID + Active Listings + View all
page paginates; home page Featured Properties renders cards with attribution.
EXIT: evidenced.

### Phase F — Buyer account 🔑 (checklist 16–19)
Favorite 3 listings → dashboard favorites lists them; save a search (alert toggle saves —
no email verification); recently-viewed shows browsed listings; /properties now shows
"% match" badge on at least one card.
EXIT: evidenced.

### Phase G — Agent account 🔑 (checklist 20–22)
Exclusive Listings manager: create listing with ≥1 uploaded photo → appears pending;
edit it → still/again pending; archive works (do this on a NEW test listing, leave
742 Hidden Grove alone). RSVPs page renders (≥0 rows; seeded rows visible if matched).
Listing Performance page renders views/saves/RSVP columns + matches panel.
EXIT: evidenced.

### Phase H — Admin account 🔑 (checklist 23–26)
Approval queue: approve the Phase-G test listing → visible publicly with badge; unpublish →
gone from public search. Listing Anomalies panel loads; trigger the anomaly scan once via
Inngest dev server if empty, then a dismiss works. Agent edit: change a throwaway field on
a TEST agent only — or verify MLS ID field renders populated for Maria (no value change).
Jobs dashboard lists the four new jobs.
EXIT: evidenced.

### Phase I — Production spot-check (public only, no logins)
On app.homewisefl.com: B1 search, one detail page (Price History/TCO/tags), compare page,
exclusive listing search+detail, agent profile listings. Same demo-caveat pass rules.
EXIT: evidenced.

### Phase J — Close-out
All in-scope tests enumerated in a results table (test → PASS + evidence pointer) in
docs/temp/e2e-smoke-results.md; any code fixes merged develop→main with prod READY shown;
full verify suite green if code changed; brain journal entry written.

## HARD CONSTRAINTS
- chrome-devtools MCP only. No Playwright. No email-sending actions anywhere.
- Shared prod DB: only create/modify clearly-labeled test records (e2e-*, "742 Hidden
  Grove"-style test listings); never alter real agents/contacts/MLS rows.
- No schema changes. Code fixes follow the git workflow + full verify suite.
- Demo-data caveats above define PASS — do not "fix" demo-feed limitations.
- 100% means: every in-scope sub-test individually evidenced as PASS, or moved to
  docs/temp/e2e-smoke-blockers.md with a reason only Rob can resolve.
