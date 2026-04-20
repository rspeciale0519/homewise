# RIUSA Platform Groundwork — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the HomeWise annual fee end-to-end, rename the existing `annual_brokerage_membership` bundle to `riusa_annual_dues` ($195/yr, RIUSA-only), and add minimal `platform` / `platforms[]` fields to the schema so RIUSA can be bolted on later without a painful migration.

**Architecture:** Single DB, single Next.js app. Agents tagged with `platform: "homewise" | "riusa"`. Gated rows (`BundleConfig`, `EntitlementConfig`, `Document`) carry a `platforms: String[]` allow-list, defaulting to `["homewise"]`. A shared helper + Zod schema are the single validation/filter points.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Prisma · Postgres · Stripe · Vitest + jsdom for tests · Zod for input validation · Tailwind.

**Spec:** `docs/superpowers/specs/2026-04-18-riusa-platform-groundwork-design.md`

**Branch:** `feature/riusa-platform-groundwork` (already created)

---

## File Map

**Create:**
- `src/schemas/platform.schema.ts` — Zod `PlatformSchema` and `PlatformsArraySchema`.
- `src/lib/platform/filter.ts` — `platformFilter()` / `resolveAgentPlatform()` helpers.
- `src/lib/platform/__tests__/filter.test.ts` — unit tests for helpers.
- `prisma/migrations/<timestamp>_riusa_platform_groundwork/migration.sql` — schema columns + data rename.
- `scripts/rename-riusa-stripe-product.ts` — one-shot Stripe display-name update, run at deploy.

**Modify:**
- `prisma/schema.prisma` — add `platform`, `upgradedFromRiusaAt` to Agent; `platforms` to BundleConfig, EntitlementConfig, Document.
- `prisma/seed-billing-data.ts` — rename membership product; add `platforms` to every product + entitlement entry.
- `prisma/seed-billing.ts` — add idempotency guard; write `platforms` on upsert.
- `src/schemas/billing.schema.ts` — remove `skipMembership` from `checkoutSessionSchema`.
- `src/app/api/billing/checkout/route.ts` — drop auto-add membership block; return 400 when no line items selected.
- `src/app/(marketing)/pricing/page.tsx` — filter bundles by platform; drop `membership` prop; rewrite metadata description.
- `src/components/pricing/pricing-page.tsx` — drop `membership` prop; delete membership FAQ; reword copy.
- `src/components/billing/billing-dashboard.tsx` — delete the membership banner block when there's no subscription.
- `src/components/billing/subscription-status.tsx` — delete the `productType === "membership"` branch and its display.
- `src/components/admin/billing/bundle-management.tsx` — render `platforms` array as pills in the admin table.
- `src/lib/billing/entitlements.ts` — platform-aware entitlement + bundle checks.
- `src/lib/billing/__tests__/entitlements.test.ts` — add platform-gating cases.

---

## Phase 1 — Foundation (Zod + helper)

### Task 1: Add `PlatformSchema` Zod validation

**Files:**
- Create: `src/schemas/platform.schema.ts`
- Create: `src/schemas/__tests__/platform.schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/schemas/__tests__/platform.schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PlatformSchema, PlatformsArraySchema } from "../platform.schema";

describe("PlatformSchema", () => {
  it("accepts 'homewise' and 'riusa'", () => {
    expect(PlatformSchema.parse("homewise")).toBe("homewise");
    expect(PlatformSchema.parse("riusa")).toBe("riusa");
  });

  it("rejects unknown values", () => {
    expect(() => PlatformSchema.parse("homewize")).toThrow();
    expect(() => PlatformSchema.parse("")).toThrow();
    expect(() => PlatformSchema.parse("HOMEWISE")).toThrow();
  });
});

describe("PlatformsArraySchema", () => {
  it("accepts single- and multi-value arrays of valid platforms", () => {
    expect(PlatformsArraySchema.parse(["homewise"])).toEqual(["homewise"]);
    expect(PlatformsArraySchema.parse(["homewise", "riusa"])).toEqual(["homewise", "riusa"]);
  });

  it("rejects empty arrays", () => {
    expect(() => PlatformsArraySchema.parse([])).toThrow();
  });

  it("rejects arrays with any unknown value", () => {
    expect(() => PlatformsArraySchema.parse(["homewise", "realty"])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/schemas/__tests__/platform.schema.test.ts`
Expected: FAIL — `Cannot find module '../platform.schema'`.

- [ ] **Step 3: Create the schema file**

Create `src/schemas/platform.schema.ts`:

```ts
import { z } from "zod";

export const PlatformSchema = z.enum(["homewise", "riusa"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const PlatformsArraySchema = z.array(PlatformSchema).min(1);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/schemas/__tests__/platform.schema.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/platform.schema.ts src/schemas/__tests__/platform.schema.test.ts
git commit -m "feat(platform): add PlatformSchema Zod validation"
```

---

### Task 2: Add platform filter helper

**Files:**
- Create: `src/lib/platform/filter.ts`
- Create: `src/lib/platform/__tests__/filter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/platform/__tests__/filter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { platformFilter, resolveAgentPlatform } from "../filter";

describe("platformFilter", () => {
  it("defaults to homewise when called with no argument", () => {
    expect(platformFilter()).toEqual({ platforms: { has: "homewise" } });
  });

  it("produces a has-clause for the specified platform", () => {
    expect(platformFilter("riusa")).toEqual({ platforms: { has: "riusa" } });
    expect(platformFilter("homewise")).toEqual({ platforms: { has: "homewise" } });
  });
});

describe("resolveAgentPlatform", () => {
  it("defaults to homewise when agent is null", () => {
    expect(resolveAgentPlatform(null)).toBe("homewise");
  });

  it("returns the agent's platform", () => {
    expect(resolveAgentPlatform({ platform: "homewise" })).toBe("homewise");
    expect(resolveAgentPlatform({ platform: "riusa" })).toBe("riusa");
  });

  it("falls back to homewise on unexpected values", () => {
    expect(resolveAgentPlatform({ platform: "" })).toBe("homewise");
    expect(resolveAgentPlatform({ platform: "whatever" } as { platform: string })).toBe("homewise");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/platform/__tests__/filter.test.ts`
Expected: FAIL — `Cannot find module '../filter'`.

- [ ] **Step 3: Create the helper**

Create `src/lib/platform/filter.ts`:

```ts
import { platformSchema, type Platform } from "@/schemas/platform.schema";

export type { Platform };

export function platformFilter(platform: Platform = "homewise") {
  return { platforms: { has: platform } };
}

export function resolveAgentPlatform(agent: { platform: string } | null): Platform {
  if (!agent) return "homewise";
  const parsed = platformSchema.safeParse(agent.platform);
  return parsed.success ? parsed.data : "homewise";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/platform/__tests__/filter.test.ts`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/platform/filter.ts src/lib/platform/__tests__/filter.test.ts
git commit -m "feat(platform): add platformFilter and resolveAgentPlatform helpers"
```

---

## Phase 2 — Schema + migration + seed

### Task 3: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `platform` and `upgradedFromRiusaAt` to the Agent model**

In `prisma/schema.prisma`, find the `model Agent` block (around line 11). Inside the model, add these two fields (place them after the existing `brandColor` field, before `userId`):

```prisma
  platform            String    @default("homewise")
  upgradedFromRiusaAt DateTime?
```

Add to the indexes at the bottom of the model:

```prisma
  @@index([platform])
```

The complete tail of the model should read:

```prisma
  @@index([lastName])
  @@index([active])
  @@index([platform])
}
```

- [ ] **Step 2: Add `platforms` to BundleConfig**

Find `model BundleConfig` (around line 933). Add above the `createdAt` line:

```prisma
  platforms       String[]        @default(["homewise"])
```

Prisma does not support array-column indexes in its schema syntax. We will add the GIN index via raw SQL in the migration file (Task 4).

- [ ] **Step 3: Add `platforms` to EntitlementConfig**

Find `model EntitlementConfig` (around line 921). Add above `createdAt`:

```prisma
  platforms       String[] @default(["homewise"])
```

- [ ] **Step 4: Add `platforms` to Document**

Find `model Document` (around line 1020). Add above `createdAt`:

```prisma
  platforms       String[]                     @default(["homewise"])
```

- [ ] **Step 5: Verify schema parses**

Run: `npx prisma format`
Expected: Formats `prisma/schema.prisma` successfully. No errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(platform): add platform fields to Agent, BundleConfig, EntitlementConfig, Document"
```

---

### Task 4: Create migration with GIN indexes and data rename

**Files:**
- Create: `prisma/migrations/<timestamp>_riusa_platform_groundwork/migration.sql`

- [ ] **Step 1: Generate the migration scaffold without applying**

Run: `npx prisma migrate dev --name riusa_platform_groundwork --create-only`
Expected: Creates a new folder under `prisma/migrations/` named `<timestamp>_riusa_platform_groundwork` with a `migration.sql` file.

Note the exact folder name Prisma generates — you'll reference it in the next step.

- [ ] **Step 2: Append GIN indexes and the bundle rename to the generated SQL**

Open the generated `migration.sql`. Prisma will have emitted the `ALTER TABLE ... ADD COLUMN` statements for the new fields. **After** those statements, append:

```sql
-- GIN indexes for array lookups
CREATE INDEX "BundleConfig_platforms_idx" ON "BundleConfig" USING GIN ("platforms");
CREATE INDEX "EntitlementConfig_platforms_idx" ON "EntitlementConfig" USING GIN ("platforms");
CREATE INDEX "Document_platforms_idx" ON "Document" USING GIN ("platforms");

-- Rename the annual fee bundle to RIUSA dues
UPDATE "BundleConfig"
SET slug = 'riusa_annual_dues',
    name = 'RIUSA Annual Dues',
    description = 'Annual membership dues for Realty International USA agents.',
    "annualAmount" = 19500,
    platforms = ARRAY['riusa']
WHERE slug = 'annual_brokerage_membership';
```

- [ ] **Step 3: Apply the migration to your local DB**

Run: `npx prisma migrate dev`
Expected: Migration applies. Output includes `Applied migration ... riusa_platform_groundwork`.

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` message.

- [ ] **Step 5: Verify the DB state with a quick query**

Run (from project root):

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const riusa = await p.bundleConfig.findUnique({ where: { slug: 'riusa_annual_dues' } });
  const old = await p.bundleConfig.findUnique({ where: { slug: 'annual_brokerage_membership' } });
  console.log('riusa_annual_dues:', riusa ? { name: riusa.name, amount: riusa.annualAmount, platforms: riusa.platforms } : 'NOT FOUND');
  console.log('annual_brokerage_membership:', old ? 'STILL PRESENT (unexpected)' : 'gone');
  await p.\$disconnect();
})();
"
```

Expected:
```
riusa_annual_dues: { name: 'RIUSA Annual Dues', amount: 19500, platforms: [ 'riusa' ] }
annual_brokerage_membership: gone
```

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(platform): migration adds platform columns, GIN indexes, and renames annual bundle"
```

---

### Task 5: Update seed data

**Files:**
- Modify: `prisma/seed-billing-data.ts`
- Modify: `prisma/seed-billing.ts`

- [ ] **Step 1: Update the `ProductDef` type and rename the membership entry**

In `prisma/seed-billing-data.ts`, extend the `ProductDef` interface and update the membership product entry. Replace lines 3–26 with:

```ts
export interface ProductDef {
  slug: string;
  name: string;
  description: string;
  productType: string;
  monthlyAmount: number;
  annualAmount: number;
  hasMonthly: boolean;
  hasAnnual: boolean;
  sortOrder: number;
  platforms: string[];
}

export const PRODUCTS: ProductDef[] = [
  {
    slug: "riusa_annual_dues",
    name: "RIUSA Annual Dues",
    description: "Annual membership dues for Realty International USA agents.",
    productType: "membership",
    monthlyAmount: 0,
    annualAmount: 19500,
    hasMonthly: false,
    hasAnnual: true,
    sortOrder: 0,
    platforms: ["riusa"],
  },
```

- [ ] **Step 2: Add `platforms: ["homewise"]` to every other PRODUCT entry**

In the same file, each remaining product (`ai_power_tools`, `marketing_suite`, `growth_engine`, `extra_ai_credits`, `advanced_training_library`, `property_alerts_pack`, `white_label_cma_reports`) must add `platforms: ["homewise"]` before the closing brace. Example for one entry:

```ts
  {
    slug: "ai_power_tools",
    name: "AI Power Tools",
    description: "Advanced AI-powered tools for CMA reports, lead scoring, listing descriptions, and more.",
    productType: "ai_power_tools",
    monthlyAmount: 4900,
    annualAmount: 49900,
    hasMonthly: true,
    hasAnnual: true,
    sortOrder: 1,
    platforms: ["homewise"],
  },
```

Apply the same addition to all seven non-membership entries.

- [ ] **Step 3: Update the `EntitlementDef` type and add `platforms` to every entitlement**

In the same file, find the `EntitlementDef` interface (around line 106). Update it to include `platforms`:

```ts
export interface EntitlementDef {
  featureKey: string;
  featureName: string;
  requiredProduct: string | null;
  freeLimit: number | null;
  description: string;
  platforms: string[];
}
```

Then add `platforms: ["homewise"]` to every entry in the `ENTITLEMENTS` array.

- [ ] **Step 4: Update `prisma/seed-billing.ts` to write `platforms` and delete orphan row**

In `prisma/seed-billing.ts`:

(a) At the top of `seedBilling()`, **before** the PRODUCTS loop (just after `console.log("1. Seeding BundleConfig records...")`), add:

```ts
  const orphan = await prisma.bundleConfig.deleteMany({
    where: { slug: "annual_brokerage_membership" },
  });
  if (orphan.count > 0) {
    console.log(`  Removed ${orphan.count} legacy 'annual_brokerage_membership' row(s)`);
  }
```

(b) In the BundleConfig upsert, add `platforms: product.platforms` to both `update` and `create` blocks. After the edit, the upsert reads:

```ts
    await prisma.bundleConfig.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        stripeProductId,
        monthlyPriceId,
        annualPriceId,
        monthlyAmount: product.monthlyAmount,
        annualAmount: product.annualAmount,
        productType: product.productType,
        sortOrder: product.sortOrder,
        isActive: true,
        platforms: product.platforms,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        stripeProductId,
        monthlyPriceId,
        annualPriceId,
        monthlyAmount: product.monthlyAmount,
        annualAmount: product.annualAmount,
        productType: product.productType,
        sortOrder: product.sortOrder,
        isActive: true,
        platforms: product.platforms,
      },
    });
```

(c) In the EntitlementConfig upsert (around line 144), add `platforms: entitlement.platforms` to both `update` and `create`:

```ts
    await prisma.entitlementConfig.upsert({
      where: { featureKey: entitlement.featureKey },
      update: {
        featureName: entitlement.featureName,
        requiredProduct: entitlement.requiredProduct,
        freeLimit: entitlement.freeLimit,
        description: entitlement.description,
        isActive: true,
        platforms: entitlement.platforms,
      },
      create: {
        featureKey: entitlement.featureKey,
        featureName: entitlement.featureName,
        requiredProduct: entitlement.requiredProduct,
        freeLimit: entitlement.freeLimit,
        description: entitlement.description,
        isActive: true,
        platforms: entitlement.platforms,
      },
    });
```

- [ ] **Step 5: Run the seed**

Run: `npx tsx prisma/seed-billing.ts`
Expected: Seed completes without errors. The `riusa_annual_dues` row is upserted with `platforms: ['riusa']`. The `annual_brokerage_membership` row is either silently absent (already removed by the migration) or removed by the orphan guard.

- [ ] **Step 6: Verify seed results**

Run: `npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); (async () => { const all = await p.bundleConfig.findMany({ select: { slug: true, platforms: true } }); console.table(all); await p.\$disconnect(); })();"`
Expected: All bundles listed. `riusa_annual_dues` has `platforms: ['riusa']`; every other bundle has `platforms: ['homewise']`. No `annual_brokerage_membership` row.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed-billing-data.ts prisma/seed-billing.ts
git commit -m "feat(platform): seed data tags platforms and renames annual bundle to RIUSA dues"
```

---

## Phase 3 — Entitlements gate (core behavior)

### Task 6: Make `checkEntitlement` platform-aware

**Files:**
- Modify: `src/lib/billing/entitlements.ts`
- Modify: `src/lib/billing/__tests__/entitlements.test.ts`

- [ ] **Step 1: Write the failing platform-gating tests**

Open `src/lib/billing/__tests__/entitlements.test.ts`. At the top, extend the mocks to include `agent.findUnique`:

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findUnique: vi.fn() },
    entitlementConfig: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    bundleFeature: { findFirst: vi.fn() },
    usageRecord: { findUnique: vi.fn(), upsert: vi.fn() },
    bundleConfig: { findFirst: vi.fn() },
  },
}));
```

Add a typed accessor near the other `mock*` declarations:

```ts
const mockAgent = prisma.agent as {
  findUnique: ReturnType<typeof vi.fn>;
};
```

At the end of the existing `describe("checkEntitlement", ...)` block, append a new nested describe:

```ts
describe("platform gating", () => {
  it("denies a RIUSA agent access to an entitlement tagged homewise-only", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "riusa" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "ai_cma_reports",
      isActive: true,
      requiredProduct: "ai_power_tools",
      freeLimit: null,
      platforms: ["homewise"],
    });

    const result = await checkEntitlement("agent-riusa", "ai_cma_reports");

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      limit: null,
      upgradeBundle: null,
    });
  });

  it("allows a HW agent access to a homewise-tagged entitlement (with active product)", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "ai_cma_reports",
      isActive: true,
      requiredProduct: "ai_power_tools",
      freeLimit: null,
      platforms: ["homewise"],
    });
    mockSubscription.findUnique.mockResolvedValue({
      status: "active",
      currentPeriodStart: new Date("2026-04-01"),
      items: [{ productType: "ai_power_tools" }],
    });
    mockBundleFeature.findFirst.mockResolvedValue({ limit: null });

    const result = await checkEntitlement("agent-hw", "ai_cma_reports");

    expect(result.allowed).toBe(true);
  });

  it("allows any agent when the entitlement is dual-platform", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "riusa" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "ai_cma_reports",
      isActive: true,
      requiredProduct: "ai_power_tools",
      freeLimit: null,
      platforms: ["homewise", "riusa"],
    });
    mockSubscription.findUnique.mockResolvedValue({
      status: "active",
      currentPeriodStart: new Date("2026-04-01"),
      items: [{ productType: "ai_power_tools" }],
    });
    mockBundleFeature.findFirst.mockResolvedValue({ limit: null });

    const result = await checkEntitlement("agent-riusa", "ai_cma_reports");

    expect(result.allowed).toBe(true);
  });

  it("defaults unknown agent platform to homewise", async () => {
    mockAgent.findUnique.mockResolvedValue(null);
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "ai_cma_reports",
      isActive: true,
      requiredProduct: "ai_power_tools",
      freeLimit: null,
      platforms: ["homewise"],
    });
    mockSubscription.findUnique.mockResolvedValue(null);
    mockBundleConfig.findFirst.mockResolvedValue({ slug: "ai_power_tools" });

    const result = await checkEntitlement("unknown-agent", "ai_cma_reports");

    expect(result.allowed).toBe(false);
    expect(result.upgradeBundle).toBe("ai_power_tools");
  });
});
```

**Existing tests note:** Update every pre-existing `mockEntitlementConfig.findUnique.mockResolvedValue(...)` call in this file to include `platforms: ["homewise"]` on the returned object, and every pre-existing pass-through flow must include a `mockAgent.findUnique.mockResolvedValue({ platform: "homewise" })` call in the test body before invoking `checkEntitlement`. Do this by reading each existing test and adding the two mock setups wherever they are missing.

- [ ] **Step 2: Run tests to verify the new platform-gating cases fail**

Run: `npx vitest run src/lib/billing/__tests__/entitlements.test.ts`
Expected: The 4 new `describe("platform gating")` tests FAIL (the current implementation doesn't look at platform). Existing tests should still pass after the mock adjustments from Step 1.

- [ ] **Step 3: Update `checkEntitlement` to filter by platform**

In `src/lib/billing/entitlements.ts`, update the function. Replace the current body (lines 43–114) with:

```ts
import { resolveAgentPlatform } from "@/lib/platform/filter";

export async function checkEntitlement(
  agentId: string,
  featureKey: string,
): Promise<EntitlementCheck> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { platform: true },
  });
  const platform = resolveAgentPlatform(agent);

  const config = await prisma.entitlementConfig.findUnique({
    where: { featureKey },
  });

  if (!config || !config.isActive || !config.requiredProduct) {
    return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
  }

  if (!config.platforms.includes(platform)) {
    return { allowed: false, remaining: 0, limit: null, upgradeBundle: null };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { agentId },
    include: { items: true },
  });

  const activeStatuses = ["active", "trialing"];
  const hasProduct =
    subscription &&
    activeStatuses.includes(subscription.status) &&
    subscription.items.some((item) => item.productType === config.requiredProduct);

  if (hasProduct) {
    const bundleFeature = await prisma.bundleFeature.findFirst({
      where: {
        featureKey,
        bundle: { productType: config.requiredProduct, isActive: true },
      },
    });

    if (!bundleFeature || bundleFeature.limit === null) {
      return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
    }

    const periodStart = subscription.currentPeriodStart;
    const usageCount = await getUsageCount(agentId, featureKey, periodStart);
    const remaining = bundleFeature.limit - usageCount;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: bundleFeature.limit,
      upgradeBundle: null,
    };
  }

  if (config.freeLimit !== null && config.freeLimit !== undefined) {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const usageCount = await getUsageCount(agentId, featureKey, periodStart);
    const remaining = config.freeLimit - usageCount;

    if (usageCount < config.freeLimit) {
      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        limit: config.freeLimit,
        upgradeBundle: null,
      };
    }
  }

  const upgradeBundle = await getUpgradeBundleSlug(config.requiredProduct, platform);

  return {
    allowed: false,
    remaining: 0,
    limit: config.freeLimit ?? null,
    upgradeBundle,
  };
}
```

Then update `getUpgradeBundleSlug` (currently lines 35–41) to take platform and filter by it:

```ts
async function getUpgradeBundleSlug(
  productType: string,
  platform: string,
): Promise<string | null> {
  const bundle = await prisma.bundleConfig.findFirst({
    where: { productType, isActive: true, platforms: { has: platform } },
    orderBy: { sortOrder: "asc" },
  });
  return bundle?.slug ?? null;
}
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `npx vitest run src/lib/billing/__tests__/entitlements.test.ts`
Expected: All tests pass (original set + 4 new platform-gating tests).

- [ ] **Step 5: Type-check the project**

Run: `npm run type-check`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing/entitlements.ts src/lib/billing/__tests__/entitlements.test.ts
git commit -m "feat(billing): platform-aware entitlement gating"
```

---

## Phase 4 — HW-side read-path cleanup

### Task 7: Update marketing pricing page loader

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Replace metadata description**

In `src/app/(marketing)/pricing/page.tsx`, replace lines 5–9:

```ts
export const metadata: Metadata = {
  title: "Pricing — Home Wise Realty Group",
  description:
    "Transparent pricing for Home Wise agents. Choose the bundles and features that match how you work — no required annual fees.",
};
```

- [ ] **Step 2: Add platform filter to the BundleConfig query and drop the membership prop**

Replace the entire `PricingServerPage` function (lines 34–85) with:

```ts
export default async function PricingServerPage() {
  const [configs, entitlements] = await Promise.all([
    prisma.bundleConfig.findMany({
      where: { isActive: true, platforms: { has: "homewise" } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        productType: true,
        monthlyAmount: true,
        annualAmount: true,
        monthlyPriceId: true,
        annualPriceId: true,
        sortOrder: true,
        features: {
          select: { featureKey: true, limit: true },
        },
      },
    }),
    prisma.entitlementConfig.findMany({
      where: {
        isActive: true,
        requiredProduct: { not: null },
        platforms: { has: "homewise" },
      },
      select: {
        id: true,
        featureKey: true,
        featureName: true,
        requiredProduct: true,
        freeLimit: true,
        description: true,
      },
    }),
  ]);

  const bundleOrder = ["marketing_suite", "ai_power_tools", "growth_engine"];
  const bundles = configs
    .filter((b) => bundleOrder.includes(b.productType))
    .sort((a, b) => bundleOrder.indexOf(a.productType) - bundleOrder.indexOf(b.productType));

  const addOns = configs.filter((b) => b.productType === "add_on");

  return (
    <PricingPage
      bundles={bundles}
      addOns={addOns}
      entitlements={entitlements}
    />
  );
}
```

- [ ] **Step 3: Remove the `membership` field from the exported `BundleWithFeatures` type — no changes needed here** (the type doesn't reference membership; only the `PricingPage` prop does).

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: A type error on `PricingPage` because it still accepts a `membership` prop. This is resolved in Task 8. Proceed anyway — the commit is intentionally intermediate; the full pricing surface is updated in one atomic group after Task 8.

Wait until Task 8 is complete before running the next type-check.

- [ ] **Step 5: Do not commit yet** — combine this edit with Task 8's commit.

---

### Task 8: Update the pricing page component

**Files:**
- Modify: `src/components/pricing/pricing-page.tsx`

- [ ] **Step 1: Drop `membership` from `PricingPageProps`**

In `src/components/pricing/pricing-page.tsx`, update the interface (around line 15) by removing the `membership` prop:

```ts
interface PricingPageProps {
  bundles: BundleWithFeatures[];
  addOns: BundleWithFeatures[];
  entitlements: FeatureEntitlement[];
}
```

Then update the component signature (around line 59):

```ts
export function PricingPage({
  bundles,
  addOns: _addOns,
  entitlements,
}: PricingPageProps) {
```

- [ ] **Step 2: Rewrite FAQ list**

Replace the `FAQ_ITEMS` constant (around lines 26–57) with:

```ts
const FAQ_ITEMS = [
  {
    question: "Can I add or remove bundles later?",
    answer:
      "Absolutely. You can upgrade or downgrade your bundle selection at any time from your billing dashboard. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "What\u2019s the difference between Bundles and Build Your Own?",
    answer:
      "Bundles are curated feature packages at a discounted price. Build Your Own lets you pick individual features \u00e0 la carte, but the total will typically be higher than the equivalent bundle.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit and debit cards, as well as ACH bank transfers (US accounts). Payments are processed securely through Stripe.",
  },
  {
    question: "What happens if my payment fails?",
    answer:
      "We provide a grace period and multiple retry attempts. You\u2019ll receive email notifications and have access to your account during that window. After the grace period, access to paid features is suspended until payment is resolved.",
  },
  {
    question: "Are there any setup fees?",
    answer:
      "No setup fees. You only pay for the bundles or individual features you select.",
  },
];
```

- [ ] **Step 3: Remove membership-referencing copy**

Search the file for remaining "Annual Brokerage Membership" or "annual membership" copy (around line 193, inside the JSX). Replace the sentence:

> "Start with the Annual Brokerage Membership, then add bundles or build your own."

with:

> "Pick the bundles or individual features that fit how you work."

- [ ] **Step 4: Delete the membership JSX block, helper, and hero paragraph**

Three deletions/edits in the component body:

(a) Delete line 134 entirely:

```ts
const membershipPrice = membership?.annualAmount ?? 49900;
```

(b) Replace the hero paragraph (lines ~192–195):

```tsx
<p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
  Start with the Annual Brokerage Membership, then add bundles or build
  your own plan.
</p>
```

with:

```tsx
<p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
  Pick the bundles or individual features that fit how you work.
</p>
```

(c) Delete the entire membership banner block (starts at the `{/* Membership Banner */}` comment around line 203 and extends through the closing of the `{membership && (...)}` conditional — roughly lines 203–230 or until the next top-level JSX section). The block begins `{membership && (` and ends `)}`. After deletion, the next sibling JSX (bundles grid or similar) stays intact.

- [ ] **Step 5: Disable "Get Started" when no selection**

The component already computes `hasSelections` at line 164:

```ts
const hasSelections = selectedBundles.size > 0 || selectedFeatures.size > 0;
```

Find every checkout / "Get Started" button in the component (search for `handleSubscribe` which is the click handler, or for `onClick={handleSubscribe}`). On each such button, set:

```tsx
<button
  disabled={loading || !hasSelections}
  onClick={handleSubscribe}
  // ... existing classes
>
```

Apply consistently to every trigger. If the button currently has `disabled={loading}`, replace with `disabled={loading || !hasSelections}`.

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: No errors (the Task 7 page.tsx no longer passes `membership`, and the component no longer accepts it).

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: No errors on the changed files.

- [ ] **Step 8: Commit Task 7 + Task 8 together**

```bash
git add src/app/(marketing)/pricing/page.tsx src/components/pricing/pricing-page.tsx
git commit -m "feat(pricing): remove annual membership from HW pricing page"
```

---

## Phase 5 — HW-side write-path cleanup

### Task 9: Update checkout route

**Files:**
- Modify: `src/schemas/billing.schema.ts`
- Modify: `src/app/api/billing/checkout/route.ts`

- [ ] **Step 1: Remove `skipMembership` from the checkout schema**

In `src/schemas/billing.schema.ts`, update `checkoutSessionSchema` (lines 5–12):

```ts
export const checkoutSessionSchema = z.object({
  bundles: z.array(z.string()).default([]),
  addOns: z.array(z.string()).default([]),
  billingInterval: z.enum(["monthly", "annual"]).default("annual"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
```

- [ ] **Step 2: Remove the auto-add block and add empty-state guard**

In `src/app/api/billing/checkout/route.ts`, replace lines 75–82 (the destructure) with:

```ts
  const { bundles, addOns, billingInterval, successUrl, cancelUrl } = parsed.data;
```

Then remove lines 111–124 entirely (the `if (!skipMembership) { ... }` block).

After the `for (const slug of addOns)` loop (around line 144), before the `try` block with `stripe.checkout.sessions.create`, add:

```ts
  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No items selected. Pick at least one bundle or feature." },
      { status: 400 },
    );
  }
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: No errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: No errors on changed files.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/billing.schema.ts src/app/api/billing/checkout/route.ts
git commit -m "feat(checkout): drop membership auto-add, reject empty checkouts"
```

---

### Task 10: Update billing dashboard

**Files:**
- Modify: `src/components/billing/billing-dashboard.tsx`

- [ ] **Step 1: Delete the membership banner for unsubscribed agents**

In `src/components/billing/billing-dashboard.tsx`, find the `if (!subscription)` block (around line 156). Replace the body (lines 157–194) with:

```tsx
  if (!subscription) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="text-center mb-8">
          <h3 className="font-serif text-xl font-semibold text-navy-700 mb-2">
            Choose your plan
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Pick the bundles or individual features that match how you work.
            You can upgrade, downgrade, or cancel at any time.
          </p>
        </div>

        <PlanManager
          subscription={null}
          bundleConfigs={bundleConfigs}
          entitlements={entitlements}
          isNewSubscription
        />
      </div>
    );
  }
```

This removes both the `membershipConfig` lookup and the navy "Annual Brokerage Membership" banner card.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: No errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/billing/billing-dashboard.tsx
git commit -m "feat(billing): remove Annual Brokerage Membership banner from dashboard"
```

---

### Task 11: Update subscription status UI

**Files:**
- Modify: `src/components/billing/subscription-status.tsx`

- [ ] **Step 1: Remove the membership lookup and display block**

In `src/components/billing/subscription-status.tsx`, remove line 44 (the `membership` lookup):

Before:
```ts
  const bundles = items.filter((item) => item.productType === "bundle");
  const addons = items.filter((item) => item.productType === "addon");
  const membership = items.find((item) => item.productType === "membership");
```

After:
```ts
  const bundles = items.filter((item) => item.productType === "bundle");
  const addons = items.filter((item) => item.productType === "addon");
```

Remove lines 82–87 (the conditional membership display):

```tsx
        {membership && (
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Membership</p>
            <p className="text-navy-700">{membership.productName}</p>
          </div>
        )}
```

The grid above (line 72) containing "Current period" becomes a single-child grid; either keep as-is (Tailwind handles it) or change `grid-cols-1 sm:grid-cols-2` to `grid-cols-1`. Keep `grid-cols-1 sm:grid-cols-2` — no layout regression when only one column is present.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: No errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/billing/subscription-status.tsx
git commit -m "feat(billing): remove membership branch from subscription status UI"
```

---

## Phase 6 — Admin surfacing + Stripe rename

### Task 12: Add `platforms` column to admin bundle management

**Files:**
- Modify: `src/components/admin/billing/bundle-management.tsx`

**Context:** The admin API (`src/app/api/admin/billing/bundles/route.ts`) returns bundles via `prisma.bundleConfig.findMany({ include: { features: true } })` which Prisma populates with **all** scalar fields — so `platforms` flows through without a server change. Only the client component needs updating.

- [ ] **Step 1: Add `platforms` to the local `Bundle` interface**

In `src/components/admin/billing/bundle-management.tsx`, update the `Bundle` interface (lines 13–24):

```ts
interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyAmount: number;
  annualAmount: number;
  productType: string;
  isActive: boolean;
  sortOrder: number;
  platforms: string[];
  features: BundleFeature[];
}
```

- [ ] **Step 2: Locate the table header and body**

Open `src/components/admin/billing/bundle-management.tsx` and find the `<table>` element (further down the file past the form section). Identify:

- The `<thead>` row containing `<th>` cells for existing columns (Name, Slug, Amounts, etc.).
- The `<tbody>` row that maps `bundles` into `<tr>`s.

- [ ] **Step 3: Add a "Platforms" column header**

Immediately after the "Name" column's `<th>`, insert:

```tsx
<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
  Platforms
</th>
```

- [ ] **Step 4: Add the matching cell in the body row**

At the same column position inside the `bundles.map((bundle) => ...)` body, insert:

```tsx
<td className="px-4 py-3">
  <div className="flex flex-wrap gap-1">
    {bundle.platforms.map((p) => (
      <span
        key={p}
        className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          p === "homewise"
            ? "bg-navy-50 text-navy-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {p}
      </span>
    ))}
  </div>
</td>
```

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: No errors.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/billing/bundle-management.tsx
git commit -m "feat(admin): show platforms column on bundle management table"
```

---

### Task 13: Stripe product display name rename script

**Files:**
- Create: `scripts/rename-riusa-stripe-product.ts`

- [ ] **Step 1: Create the script**

Create `scripts/rename-riusa-stripe-product.ts`:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});
const prisma = new PrismaClient();

async function main() {
  const bundle = await prisma.bundleConfig.findUnique({
    where: { slug: "riusa_annual_dues" },
    select: { stripeProductId: true, name: true, description: true },
  });

  if (!bundle?.stripeProductId) {
    console.log("No riusa_annual_dues bundle or missing stripeProductId — nothing to rename.");
    return;
  }

  const existing = await stripe.products.retrieve(bundle.stripeProductId);
  if (existing.name === bundle.name && existing.description === bundle.description) {
    console.log(`Stripe product ${existing.id} already up to date.`);
    return;
  }

  const updated = await stripe.products.update(bundle.stripeProductId, {
    name: bundle.name,
    description: bundle.description,
    metadata: { ...existing.metadata, slug: "riusa_annual_dues" },
  });

  console.log(`Renamed Stripe product: ${updated.id} -> "${updated.name}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the script against the current (dev/test) Stripe environment**

Run: `npx tsx scripts/rename-riusa-stripe-product.ts`
Expected (fresh DB, freshly seeded): `Stripe product prod_... already up to date.` — because the seed just created the product with the new name.

Expected (DB that previously had `annual_brokerage_membership` seeded): `Renamed Stripe product: prod_... -> "RIUSA Annual Dues"`.

If the output says "No riusa_annual_dues bundle or missing stripeProductId," re-run `npx tsx prisma/seed-billing.ts` first.

- [ ] **Step 3: Commit**

```bash
git add scripts/rename-riusa-stripe-product.ts
git commit -m "feat(stripe): add one-shot script to rename annual bundle Stripe product"
```

---

## Phase 7 — Final verification

### Task 14: Full verification pass

**Files:** (no new changes)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All tests pass, including the new platform-gating tests in `entitlements.test.ts` and the two new unit-test files (`platform.schema.test.ts`, `filter.test.ts`).

- [ ] **Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Production build completes without errors.

- [ ] **Step 5: Start the dev server (if not already running)**

Run: `npm run dev` (skip if a dev server is already running on :3000 per CLAUDE.md Rule 3).

- [ ] **Step 6: Playwright smoke — public pricing page**

Using the Playwright MCP tools per CLAUDE.md Rule 4, navigate to `http://localhost:3000/pricing`. Verify:

- Page loads without console errors.
- No "Annual Brokerage Membership" card, heading, or FAQ item appears.
- The FAQ list starts with "Can I add or remove bundles later?" (membership FAQ is gone).
- With zero bundles selected, the primary "Get Started" / checkout button is disabled.
- Selecting any bundle enables the button.

- [ ] **Step 7: Playwright smoke — agent billing dashboard (if feasible)**

Sign in as a seeded test agent (or use existing test fixtures). Navigate to `/dashboard/billing`. Verify the dashboard renders without a navy "Annual Brokerage Membership" banner and without console errors. If no test agent exists, skip this step and note it in the PR description.

- [ ] **Step 8: Playwright smoke — admin bundles page**

Navigate to `/admin/billing/bundles` (signed in as admin). Verify the bundles table now includes a Platforms column. The `riusa_annual_dues` row shows an amber `riusa` pill. All other rows show a navy `homewise` pill.

- [ ] **Step 9: Leave browser open per CLAUDE.md Rule 4**

Do not close the browser; wait for explicit confirmation from the user.

- [ ] **Step 10: Final commit (if any incidental fixes arose during smoke tests)**

If any fix-ups are needed from the smoke test, make them, stage, and commit with a descriptive message. Otherwise, no commit is needed in this task.

---

## Execution Order Summary

1. Task 1 → commit — Zod platform schema
2. Task 2 → commit — platform filter helper
3. Task 3 → commit — Prisma schema edits
4. Task 4 → commit — migration + GIN indexes + data rename
5. Task 5 → commit — seed data + idempotency
6. Task 6 → commit — platform-aware entitlements
7. Tasks 7+8 → **single combined commit** — marketing pricing page + pricing component
8. Task 9 → commit — checkout route
9. Task 10 → commit — billing dashboard
10. Task 11 → commit — subscription status UI
11. Task 12 → commit — admin bundle platforms column
12. Task 13 → commit — Stripe rename script
13. Task 14 → no code changes unless smoke tests reveal regressions

Expected total: ~12 commits on `feature/riusa-platform-groundwork`.

## Deploy-Time Checklist (for the operator, not for this plan)

When this branch is merged to `develop` and then promoted:

1. Run the Prisma migration on the target environment: `npx prisma migrate deploy`.
2. Run the seed to ensure BundleConfig/EntitlementConfig rows reflect the current data: `npx tsx prisma/seed-billing.ts`.
3. Run `npx tsx scripts/rename-riusa-stripe-product.ts` against the target Stripe account.
4. Verify the `/pricing` public page renders correctly in the deployed environment.
