# RIUSA Platform Groundwork + HomeWise Annual Fee Removal

**Date:** 2026-04-18
**Status:** Approved
**Branch:** `feature/riusa-platform-groundwork`

## Context

Two concerns are bundled in this spec:

1. **HomeWise (HW) agents do not pay an annual fee.** The current app treats an `annual_brokerage_membership` bundle ($499/yr) as a required baseline for all HW agents. This is incorrect and must be removed.
2. **Realty International USA (RIUSA)** is a sister brokerage for agents who are licensed but lack MLS access and do not pay dues to the NAR or similar organizations. RIUSA agents *do* pay an annual membership fee ($195/yr). A RIUSA site will be built later with the same feature set as HomeWise but with specific limitations (notably: no MLS access, so listings must be submitted to HW staff for creation under the broker's name, and no lockbox access — RIUSA agents must request access per property). When a RIUSA agent upgrades to HW, their same credentials should open the HW system seamlessly.

This spec covers:
- Removing the HW annual fee end-to-end.
- Renaming/re-tagging the existing annual fee bundle as RIUSA-specific.
- Laying minimal schema and query groundwork so RIUSA can be built later without painful migrations, but without building the RIUSA site itself.

**Out of scope:** RIUSA frontend, HW application fee ($95 one-time), HW transaction fee ($445/deal), RIUSA transaction fee ($495/deal), RIUSA-specific workflows (listing submission, lockbox request), upgrade flow mechanics. Each is captured under "Future Work."

## Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Single DB, single app | HW and RIUSA share infrastructure; RIUSA "site" is a future frontend skin/subdomain over the same backend. Upgrade = flag flip, no data movement. |
| 2 | `platform: String` on Agent (not enum, not boolean) | Matches existing `UserProfile.role` pattern; most flexible for future brands. |
| 3 | `platforms: String[]` allow-list on gated tables | Explicit, extends cleanly to a third platform, efficient with GIN index. |
| 4 | Default `platforms` to `["homewise"]` | Safer than `["homewise", "riusa"]`: new features are HW-only until explicitly vetted. Prevents accidental leaks of MLS-dependent features to RIUSA. |
| 5 | Gate at `BundleConfig`, `EntitlementConfig`, `Document` | YAGNI on `DocumentCategory`/training/calculators. Document gating is at file level only — avoids precedence ambiguity with categories. |
| 6 | Keep `productType: "membership"` stable on renamed bundle | Checkout code finds by productType; preserves future RIUSA flow compatibility. |
| 7 | `upgradedFromRiusaAt: DateTime?` audit timestamp on Agent | Cheap insurance for future "welcome upgraders" differentiated flows. |
| 8 | No DB-level enum/CHECK on `platforms` values | Validate via Zod at the API layer. Postgres doesn't support enum-of-array cleanly. |

## Schema Changes

### `Agent`

```prisma
model Agent {
  // ... existing fields ...
  platform              String    @default("homewise")
  upgradedFromRiusaAt   DateTime?
  // ... existing relations ...

  @@index([platform])
}
```

### `BundleConfig`, `EntitlementConfig`, `Document`

Each gets:

```prisma
platforms String[] @default(["homewise"])

@@index([platforms], type: Gin)
```

### Migration order

1. `ALTER TABLE "Agent" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'homewise'` + B-tree index.
2. `ALTER TABLE "Agent" ADD COLUMN "upgradedFromRiusaAt" TIMESTAMP`.
3. `ALTER TABLE "BundleConfig" ADD COLUMN "platforms" TEXT[] NOT NULL DEFAULT ARRAY['homewise']` + GIN index.
4. Same for `EntitlementConfig` and `Document`.
5. Data update:
   ```sql
   UPDATE "BundleConfig"
   SET slug = 'riusa_annual_dues',
       name = 'RIUSA Annual Dues',
       "annualAmount" = 19500,
       platforms = ARRAY['riusa']
   WHERE slug = 'annual_brokerage_membership';
   ```
6. Stripe product metadata update (outside migration, separate deploy-time script): rename the Stripe product display name from "Annual Brokerage Membership" to "RIUSA Annual Dues". Keep existing product and price IDs.

**Rollback:** Drop the new columns, revert the data update. No data loss — no customer subscriptions reference this bundle (confirmed: no HW agent has been charged).

## Annual Fee Bundle Rename

| Field | Before | After |
|-------|--------|-------|
| `slug` | `annual_brokerage_membership` | `riusa_annual_dues` |
| `name` | `Annual Brokerage Membership` | `RIUSA Annual Dues` |
| `description` | (brokerage membership copy) | RIUSA-focused copy |
| `productType` | `membership` | `membership` *(unchanged)* |
| `annualAmount` | `49900` ($499) | `19500` ($195) |
| `platforms` | *(new)* | `["riusa"]` |

Stripe side: existing product and price IDs remain linked. Only display metadata changes. No new Stripe product created.

## HW-side Code Changes

### 3a. Checkout route — remove auto-add

**File:** `src/app/api/billing/checkout/route.ts` (lines 112–123)

Remove the block that finds `bundleConfigs.find((b) => b.productType === "membership")` and pushes it to `lineItems`. HW checkout only charges for what the agent selected.

### 3b. Pricing page FAQ and copy

**File:** `src/components/pricing/pricing-page.tsx`

- Delete the FAQ item "Is the annual membership required?" (lines ~27–31).
- Reword "Start with the Annual Brokerage Membership, then add bundles..." (line ~193) to "Pick the bundles or individual features that fit how you work."
- Reword "Are there any setup fees?" answer (line ~53–55) to "No setup fees. You only pay for the bundles or individual features you select."

### 3c. Billing dashboard

**File:** `src/components/billing/billing-dashboard.tsx` (lines ~157, ~164)

Remove the `membershipConfig` lookup and the "Annual Brokerage Membership" display row. Dashboard shows only active bundles/features and add-ons.

### 3d. Seed file

**File:** `prisma/seed-billing-data.ts`

- Update the `annual_brokerage_membership` entry: new slug, name, description, amount per rename table above. Add `platforms: ["riusa"]`.
- Add `platforms: ["homewise"]` to every other product entry (`ai_power_tools`, `marketing_suite`, `growth_engine`, and all add-ons). Explicit, matches schema default.
- Add `platforms: ["homewise"]` to every `ENTITLEMENTS` entry (same reason).

### 3e. Checkout UI behavior

With auto-add gone, the UI must gracefully handle zero selections (see 3j).

### 3f. Admin billing UI

**File:** `src/components/admin/billing/bundle-management.tsx`

Admins see all bundles regardless of platform (no gating filter). Add a column displaying the `platforms` array as colored pills. **Display-only in this spec.** Editing `platforms` through the admin UI is deferred to a later spec.

### 3g. Marketing pricing page loader

**File:** `src/app/(marketing)/pricing/page.tsx`

- Metadata description (lines 7–8): remove "annual membership" language.
- `BundleConfig` query (lines 35–54): add `platforms: { has: "homewise" }` to the `where` clause.
- Remove the `configs.find((b) => b.productType === "membership")` membership lookup (line 68) and the `membership` prop passed to `<PricingPage>`.

### 3h. Subscription status UI

**File:** `src/components/billing/subscription-status.tsx` (line 44)

Remove the `items.find((item) => item.productType === "membership")` branch and any UI blocks that depend on it. All subscription items render uniformly.

### 3i. Pricing page component

**File:** `src/components/pricing/pricing-page.tsx`

- Remove `membership` from `PricingPageProps`.
- Delete the JSX section that renders membership as a required baseline.
- Rework layout so bundles are the primary pricing content.

### 3j. Checkout empty-state validation

- **Client (`pricing-page.tsx`):** disable the "Get Started" button when `selectedBundles.size + selectedFeatures.size === 0`.
- **Server (`src/app/api/billing/checkout/route.ts`):** return `400 Bad Request` with a `{ error: "No items selected" }` body if `lineItems` is empty after building.

### 3k. Entitlements check

**File:** `src/lib/billing/entitlements.ts`

Add platform-awareness:
- When computing available entitlements for an agent, filter `EntitlementConfig` rows by `platforms` containing the agent's `platform`.
- When checking for upgrade bundle availability (upgrade prompts), filter `BundleConfig` rows by `platforms` containing the agent's `platform`.
- A RIUSA agent querying an entitlement that's HW-only must receive the same locked/unavailable response (`entitled: false`, with the existing upgrade-suggestion shape) as an agent missing the required bundle. Platform mismatch is treated identically to missing-product in the return value.

### 3l. Stripe sync

**File:** `src/lib/billing/stripe-sync.ts`

Reviewed. Operates on subscription items generically — no membership-specific branches. **No change.**

### 3m. Tests

- `src/lib/billing/__tests__/entitlements.test.ts` — add cases:
  - RIUSA agent cannot access an entitlement tagged `platforms: ["homewise"]`.
  - HW agent sees all entitlements tagged `platforms: ["homewise"]`.
  - Entitlement tagged `platforms: ["homewise", "riusa"]` visible to both.
- Checkout integration tests (if any) — add case: empty `lineItems` returns 400.
- Seed sanity: after `prisma/seed-billing.ts` runs, assert `BundleConfig` with slug `riusa_annual_dues` exists with `platforms: ["riusa"]` and no row with slug `annual_brokerage_membership` remains.
- `grace-period.test.ts` — reviewed, platform-agnostic. No change.

## Query Helpers + Zod Validation

### Platform filter helper

**New file:** `src/lib/platform/filter.ts`

```ts
export type Platform = "homewise" | "riusa";

export function platformFilter(platform: Platform = "homewise") {
  return { platforms: { has: platform } };
}

export function resolveAgentPlatform(agent: { platform: string } | null): Platform {
  return (agent?.platform as Platform) ?? "homewise";
}
```

**Usage rules:**
- Public pages (no auth): `platformFilter()` — defaults to `"homewise"`.
- Authenticated agent pages: `platformFilter(resolveAgentPlatform(currentAgent))`.
- Admin pages: no filter — admins see all rows regardless of platform.

### Zod schema

**New file:** `src/schemas/platform.schema.ts`

```ts
import { z } from "zod";

export const PlatformSchema = z.enum(["homewise", "riusa"]);
export const PlatformsArraySchema = z.array(PlatformSchema).min(1);
```

Every admin mutation that writes `platforms[]` on a bundle/feature/document validates through `PlatformsArraySchema`. This is the single validation point.

## Seed Idempotency

`prisma/seed-billing.ts` upserts by slug. Pre-existing databases may still have the old slug. Before upserting `riusa_annual_dues`:

```ts
await prisma.bundleConfig.deleteMany({ where: { slug: "annual_brokerage_membership" } });
```

Runs once, harmless on fresh DBs (zero rows match), resolves the conflict on re-seeded legacy DBs.

## Future Work

These items are captured here for later specs; they are **not** implemented as part of this work.

1. **Full RIUSA feature-gate list.** When the HW broker provides the list of features RIUSA agents can't access, tag the corresponding `BundleConfig`/`EntitlementConfig`/`Document` rows with `platforms: ["homewise"]`. Data-only, no code change.

2. **RIUSA-specific workflows** when the RIUSA site is built:
   - Listing submission form (RIUSA agent → HW staff creates listing under the broker's name).
   - Lockbox access request flow.
   - Property search UX for RIUSA agents — hidden entirely vs. CTA to submit a search request. Decision deferred until RIUSA frontend is designed.

3. **Upgrade flow (RIUSA → HW).** When built, must:
   - Set `platform = "homewise"` and `upgradedFromRiusaAt = now()` on the Agent row.
   - Cancel the active `riusa_annual_dues` subscription item in Stripe (prorated or not — TBD).
   - Grant access to previously-blocked HW-only bundles/features.
   - Optionally send a "welcome to HomeWise" onboarding email differentiated from new HW signups.

4. **Fee structure spec (separate).** Three additional fees need PaymentIntent plumbing, admin tooling, and per-deal triggers:
   - HW application fee ($95 one-time at signup).
   - HW transaction fee ($445 per closed transaction).
   - RIUSA transaction fee ($495 per closed transaction).

5. **Subscription migration at upgrade.** When a RIUSA agent has dual-platform bundle subscriptions that carry over to HW, design whether we (a) preserve the existing Stripe subscription and swap items, or (b) cancel + recreate. Decision deferred.

6. **RIUSA frontend build.** RIUSA marketing site, pricing page, and possibly a skinned dashboard. Separate project.

7. **Admin UI for editing `platforms`.** This spec only displays the `platforms` column on the admin bundles page. A future spec can add inline editing once the broker finalizes the gate list.

## Verification Plan

1. Prisma migration applies cleanly to a local snapshot of production data. Rollback tested.
2. Stripe product display name updated via deploy-time script (dry-run first in Stripe test mode).
3. `prisma/seed-billing.ts` re-run on a fresh DB produces the expected state (no `annual_brokerage_membership` row, one `riusa_annual_dues` row tagged `["riusa"]`).
4. `npm run type-check` and `npm run lint` pass.
5. `npm run test` passes including new entitlements platform-gating cases.
6. Manual smoke test (Playwright): public `/pricing` page shows only HW bundles, no membership required, Get Started button disabled until a bundle is selected. Agent billing dashboard no longer shows a membership row.
7. Admin bundles page shows the `riusa_annual_dues` bundle with a `["riusa"]` tag visible.

## Open Questions

None blocking. The full RIUSA feature-gate list is deferred until the broker provides it; until then, every non-membership bundle/feature/document remains `platforms: ["homewise"]` by default, which is the safe state.
