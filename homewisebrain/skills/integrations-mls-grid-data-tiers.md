---
type: skill
area: integrations
status: provisional
confidence: provisional
updated: 2026-06-14
sources:
  - journal:2026-06-13
  - code:src/lib/mls-grid.ts
  - code:src/lib/vow.ts
  - code:src/lib/mls-access-log.ts
  - code:docs/temp/mls-grid-compliance-spec.md
---

# MLS Grid data tiers (IDX / VOW / BBO) and the token-superset trap

## When to use
Working on MLS Grid sync, listing visibility, market-stats/CMA, the VOW portal, or
anything that reads/writes `mlgCanUse`. Especially before any incremental re-sync.

## The approach
A record's `MlgCanUse` (the permission set) **depends on which token fetched it**:
- The **IDX** token returns `MlgCanUse=["IDX"]`.
- The **BBO/broker** token returns `MlgCanUse=["BO","IDX","VOW"]` — a superset.

So `mls-grid.ts token()` prefers `MLS_GRID_BO_TOKEN ?? BBO_ACCESS_TOKEN ?? MLS_GRID_TOKEN`.
Tier gating in the app: IDX = public display (with disclaimers); BBO = market-stats/CMA
(logs access); VOW = expanded sold-comps behind affirmative "I AGREE" assent + a
`VowRegistration` row (IDX Rules §35 pattern). All tiers write a `MlsAccessLog` entry
(`logMlsAccess()`), surfaced in `/admin/mls-compliance`.

## Pitfalls & anti-patterns
- **The trap:** if an incremental sync runs with the IDX-only token, every touched record
  is re-stamped `["IDX"]`, silently stripping BO/VOW. Backfill/sync must use the broker
  token superset or you lose tier flags. (Fixed via `scripts/backfill-bo-flags.ts`, which
  pages the BBO feed with NO media `$expand` to avoid photo churn.)
- Market-stats sold window must be **trailing 12 months**, not a single month (demo solds
  are too sparse single-month).
- VOW data must not be served before assent: logged-out → 401, unregistered → 403.
- Required attribution strings are exact (IDX Rules 22/23/24/29); don't paraphrase.

## Evidence
Browser + API verified locally and prod (a7d196d, prod flip in journal 2026-06-13):
12,793 rows BO+VOW flagged; /market real stats + attribution; VOW comps gated;
/admin/mls-compliance renders per-tier counts + access trail. NOTE: proven against MLS
Grid **demo** data only — re-verify when live (non-demo) Stellar creds land.

## Revision log
- 2026-06-14: distilled during consolidation from the IDX/VOW/BBO compliance-tier build.
