# Agent Subscription & Billing System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual agent membership fee collection with Stripe-powered billing, introduce feature bundles and add-ons, and give admins full control over pricing and agent accounts.

**Architecture:** Stripe handles all payment processing, card/ACH storage, and invoicing. The app stores subscription state via webhooks, gates features through a data-driven entitlement system (configurable by admins without code changes), and provides self-service billing for agents plus a full admin management portal.

**Tech Stack:** Stripe SDK (`stripe`), Prisma (existing), Zod (existing), Next.js App Router (existing), Supabase Auth (existing), Vitest (existing, unused)

**Spec:** `docs/superpowers/specs/2026-03-28-agent-subscription-billing-design.md`

---

## Task 1: Install Stripe SDK & Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env.local`
- Create: `src/lib/stripe.ts`

- [ ] **Step 1: Install Stripe**

```bash
npm install stripe
```

- [ ] **Step 2: Add environment variables to `.env.example`**

Add to the end of `.env.example`:
```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- [ ] **Step 3: Add actual keys to `.env.local`**

Get keys from https://dashboard.stripe.com/acct_1TEd05E4iljtkRl8/apikeys and add them to `.env.local`. The webhook secret comes after setting up the webhook endpoint (Task 5).

- [ ] **Step 4: Create Stripe client singleton**

Create `src/lib/stripe.ts`:
```typescript
import Stripe from "stripe";

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-03-31.basil",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;
```

- [ ] **Step 5: Verify import works**

```bash
npx tsx -e "import { stripe } from './src/lib/stripe'; console.log('Stripe loaded:', typeof stripe)"
```

Expected: `Stripe loaded: object`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/stripe.ts .env.example
git commit -m "feat(billing): install Stripe SDK and configure environment"
```

---

## Task 2: Add Prisma Schema Models

**Files:**
- Modify: `prisma/schema.prisma`

All models follow existing codebase patterns: `@id @default(cuid())`, string-based status fields (no Prisma enums), `@default(now())` for timestamps, `@@index` on foreign keys.

- [ ] **Step 1: Add billing models to `prisma/schema.prisma`**

Add after the existing models:

```prisma
// ─── Billing & Subscriptions ───────────────────────────────────

model StripeCustomer {
  id                   String   @id @default(cuid())
  agentId              String   @unique
  agent                Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  stripeCustomerId     String   @unique
  defaultPaymentMethod String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([stripeCustomerId])
}

model Subscription {
  id                   String             @id @default(cuid())
  agentId              String             @unique
  agent                Agent              @relation(fields: [agentId], references: [id], onDelete: Cascade)
  stripeSubscriptionId String             @unique
  status               String             @default("active") // active, past_due, canceled, trialing, unpaid, incomplete
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  trialEnd             DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  items                SubscriptionItem[]

  @@index([status])
  @@index([stripeSubscriptionId])
}

model SubscriptionItem {
  id             String       @id @default(cuid())
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  stripeItemId   String       @unique
  productType    String       // membership, ai_power_tools, marketing_suite, growth_engine, add_on
  productName    String
  stripePriceId  String
  quantity       Int          @default(1)
  createdAt      DateTime     @default(now())

  @@index([subscriptionId])
  @@index([productType])
}

model EntitlementConfig {
  id              String   @id @default(cuid())
  featureKey      String   @unique
  featureName     String
  requiredProduct String?  // null = free for all agents
  freeLimit       Int?     // null = no free access, 0 = no limit
  description     String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model BundleConfig {
  id             String          @id @default(cuid())
  name           String
  slug           String          @unique
  description    String
  stripeProductId String?
  monthlyPriceId String?
  annualPriceId  String?
  monthlyAmount  Int             // cents
  annualAmount   Int             // cents
  productType    String          // membership, ai_power_tools, marketing_suite, growth_engine, add_on
  isActive       Boolean         @default(true)
  sortOrder      Int             @default(0)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  features       BundleFeature[]
}

model BundleFeature {
  id         String       @id @default(cuid())
  bundleId   String
  bundle     BundleConfig @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  featureKey String
  limit      Int?         // null = unlimited
  createdAt  DateTime     @default(now())

  @@unique([bundleId, featureKey])
  @@index([bundleId])
}

model UsageRecord {
  id                 String   @id @default(cuid())
  agentId            String
  agent              Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  featureKey         String
  billingPeriodStart DateTime
  billingPeriodEnd   DateTime
  usageCount         Int      @default(0)
  updatedAt          DateTime @updatedAt

  @@unique([agentId, featureKey, billingPeriodStart])
  @@index([agentId])
}

model PaymentRecord {
  id                    String   @id @default(cuid())
  agentId               String
  agent                 Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  stripePaymentIntentId String?
  amount                Int      // cents
  currency              String   @default("usd")
  paymentType           String   // card, ach, cash, check
  status                String   @default("succeeded") // processing, succeeded, failed
  processedBy           String?  // admin user ID if processed on behalf
  notes                 String?
  createdAt             DateTime @default(now())

  @@index([agentId])
  @@index([status])
}

model GracePeriodOverride {
  id            String   @id @default(cuid())
  agentId       String
  agent         Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  extendedUntil DateTime
  reason        String
  grantedBy     String   // admin user ID
  createdAt     DateTime @default(now())

  @@index([agentId])
}

model BillingSettings {
  id                     String   @id @default(cuid())
  gracePeriodWarningDays Int      @default(7)
  gracePeriodUrgentDays  Int      @default(14)
  gracePeriodLockoutDays Int      @default(15)
  invoiceNotifyDays      Int      @default(7)
  trialDurationDays      Int      @default(14)
  transitionGraceDays    Int      @default(30)
  loyaltyDiscountPercent Int      @default(20)
  updatedAt              DateTime @updatedAt
}
```

- [ ] **Step 2: Add relations to the existing Agent model**

Find the `Agent` model and add these relation fields:

```prisma
  stripeCustomer      StripeCustomer?
  subscription        Subscription?
  usageRecords        UsageRecord[]
  paymentRecords      PaymentRecord[]
  gracePeriodOverrides GracePeriodOverride[]
```

- [ ] **Step 3: Generate and run migration**

```bash
npx prisma migrate dev --name add_billing_models
```

Expected: Migration applied, Prisma client regenerated.

- [ ] **Step 4: Verify schema compiles**

```bash
npx prisma validate
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat(billing): add billing and subscription Prisma models"
```

---

## Task 3: Zod Schemas for Billing

**Files:**
- Create: `src/schemas/billing.schema.ts`

- [ ] **Step 1: Create billing validation schemas**

Create `src/schemas/billing.schema.ts`:

```typescript
import { z } from "zod";

// ─── Checkout ──────────────────────────────────────────────

export const checkoutSessionSchema = z.object({
  bundles: z.array(z.string()).default([]),
  addOns: z.array(z.string()).default([]),
  billingInterval: z.enum(["monthly", "annual"]).default("annual"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

// ─── Admin: Bundle Management ──────────────────────────────

export const bundleCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(1).max(100).trim().toLowerCase().regex(/^[a-z0-9_-]+$/),
  description: z.string().min(1).max(2000).trim(),
  monthlyAmount: z.number().int().min(0),
  annualAmount: z.number().int().min(0),
  productType: z.string().min(1).max(50),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  featureKeys: z.array(z.string()).default([]),
});

export type BundleCreateInput = z.infer<typeof bundleCreateSchema>;

export const bundleUpdateSchema = bundleCreateSchema.partial();

export type BundleUpdateInput = z.infer<typeof bundleUpdateSchema>;

// ─── Admin: Feature/Entitlement Management ─────────────────

export const entitlementCreateSchema = z.object({
  featureKey: z.string().min(1).max(100).trim().toLowerCase().regex(/^[a-z0-9_]+$/),
  featureName: z.string().min(1).max(200).trim(),
  requiredProduct: z.string().max(50).nullable().default(null),
  freeLimit: z.number().int().min(0).nullable().default(null),
  description: z.string().max(1000).trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type EntitlementCreateInput = z.infer<typeof entitlementCreateSchema>;

export const entitlementUpdateSchema = entitlementCreateSchema.partial();

export type EntitlementUpdateInput = z.infer<typeof entitlementUpdateSchema>;

// ─── Admin: Payment Processing ─────────────────────────────

export const adminProcessCardPaymentSchema = z.object({
  agentId: z.string().min(1),
  amount: z.number().int().min(100), // cents, min $1
  paymentMethodId: z.string().min(1).optional(),
  savePaymentMethod: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

export type AdminProcessCardPaymentInput = z.infer<typeof adminProcessCardPaymentSchema>;

export const adminRecordOfflinePaymentSchema = z.object({
  agentId: z.string().min(1),
  amount: z.number().int().min(100), // cents, min $1
  paymentType: z.enum(["cash", "check"]),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type AdminRecordOfflinePaymentInput = z.infer<typeof adminRecordOfflinePaymentSchema>;

// ─── Admin: Subscription Management ────────────────────────

export const adminModifySubscriptionSchema = z.object({
  agentId: z.string().min(1),
  addBundles: z.array(z.string()).default([]),
  removeBundles: z.array(z.string()).default([]),
});

export type AdminModifySubscriptionInput = z.infer<typeof adminModifySubscriptionSchema>;

export const adminExtendGracePeriodSchema = z.object({
  agentId: z.string().min(1),
  extendedUntil: z.string().datetime(),
  reason: z.string().min(1).max(500).trim(),
});

export type AdminExtendGracePeriodInput = z.infer<typeof adminExtendGracePeriodSchema>;

// ─── Admin: Billing Settings ───────────────────────────────

export const billingSettingsUpdateSchema = z.object({
  gracePeriodWarningDays: z.number().int().min(1).max(30).optional(),
  gracePeriodUrgentDays: z.number().int().min(1).max(60).optional(),
  gracePeriodLockoutDays: z.number().int().min(1).max(90).optional(),
  invoiceNotifyDays: z.number().int().min(1).max(30).optional(),
  trialDurationDays: z.number().int().min(0).max(90).optional(),
  transitionGraceDays: z.number().int().min(0).max(90).optional(),
  loyaltyDiscountPercent: z.number().int().min(0).max(100).optional(),
});

export type BillingSettingsUpdateInput = z.infer<typeof billingSettingsUpdateSchema>;

// ─── Admin: Coupon Management ──────────────────────────────

export const couponCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  percentOff: z.number().min(1).max(100).optional(),
  amountOff: z.number().int().min(100).optional(), // cents
  duration: z.enum(["once", "repeating", "forever"]),
  durationInMonths: z.number().int().min(1).max(36).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
}).refine(
  (data) => data.percentOff !== undefined || data.amountOff !== undefined,
  { message: "Either percentOff or amountOff is required" }
);

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

// ─── Agent Billing Filters ─────────────────────────────────

export const billingAgentFilterSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(["all", "active", "past_due", "canceled", "trialing"]).default("all"),
  bundle: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type BillingAgentFilterInput = z.infer<typeof billingAgentFilterSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/schemas/billing.schema.ts
git commit -m "feat(billing): add Zod validation schemas for billing"
```

---

## Task 4: Entitlement Engine (Core Business Logic)

**Files:**
- Create: `src/lib/billing/entitlements.ts`
- Create: `src/lib/billing/grace-period.ts`
- Create: `src/lib/billing/stripe-sync.ts`

- [ ] **Step 1: Create entitlement checking logic**

Create `src/lib/billing/entitlements.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export interface EntitlementCheck {
  allowed: boolean;
  remaining: number | null; // null = unlimited
  limit: number | null;
  upgradeBundle: string | null; // slug of bundle that unlocks this feature
}

export async function checkEntitlement(
  agentId: string,
  featureKey: string
): Promise<EntitlementCheck> {
  const config = await prisma.entitlementConfig.findUnique({
    where: { featureKey, isActive: true },
  });

  // Feature not configured or inactive — allow by default
  if (!config) {
    return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
  }

  // Feature is free for everyone
  if (!config.requiredProduct) {
    return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
  }

  // Check if agent has the required bundle
  const subscription = await prisma.subscription.findUnique({
    where: { agentId },
    include: { items: true },
  });

  if (subscription && ["active", "trialing"].includes(subscription.status)) {
    // Check for direct product match
    const hasProduct = subscription.items.some(
      (item) => item.productType === config.requiredProduct
    );

    if (hasProduct) {
      // Check if the bundle defines a specific limit for this feature
      const bundleFeature = await prisma.bundleFeature.findFirst({
        where: {
          featureKey,
          bundle: { productType: config.requiredProduct, isActive: true },
        },
      });

      const limit = bundleFeature?.limit ?? null;
      if (limit === null) {
        return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
      }

      // Metered: check usage
      const usage = await getUsageCount(agentId, featureKey, subscription);
      return {
        allowed: usage < limit,
        remaining: Math.max(0, limit - usage),
        limit,
        upgradeBundle: null,
      };
    }
  }

  // Agent doesn't have the bundle — check free-tier limit
  if (config.freeLimit !== null && config.freeLimit > 0) {
    const usage = await getUsageCount(agentId, featureKey, subscription);
    const upgradeBundle = await getUpgradeBundleSlug(config.requiredProduct);
    return {
      allowed: usage < config.freeLimit,
      remaining: Math.max(0, config.freeLimit - usage),
      limit: config.freeLimit,
      upgradeBundle,
    };
  }

  // No free access
  const upgradeBundle = await getUpgradeBundleSlug(config.requiredProduct);
  return { allowed: false, remaining: 0, limit: 0, upgradeBundle };
}

export async function incrementUsage(
  agentId: string,
  featureKey: string
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { agentId },
  });

  const now = new Date();
  const periodStart = subscription?.currentPeriodStart ?? startOfMonth(now);
  const periodEnd = subscription?.currentPeriodEnd ?? endOfMonth(now);

  await prisma.usageRecord.upsert({
    where: {
      agentId_featureKey_billingPeriodStart: {
        agentId,
        featureKey,
        billingPeriodStart: periodStart,
      },
    },
    update: { usageCount: { increment: 1 } },
    create: {
      agentId,
      featureKey,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      usageCount: 1,
    },
  });
}

async function getUsageCount(
  agentId: string,
  featureKey: string,
  subscription: { currentPeriodStart: Date } | null
): Promise<number> {
  const periodStart = subscription?.currentPeriodStart ?? startOfMonth(new Date());

  const record = await prisma.usageRecord.findUnique({
    where: {
      agentId_featureKey_billingPeriodStart: {
        agentId,
        featureKey,
        billingPeriodStart: periodStart,
      },
    },
  });

  return record?.usageCount ?? 0;
}

async function getUpgradeBundleSlug(productType: string): Promise<string | null> {
  const bundle = await prisma.bundleConfig.findFirst({
    where: { productType, isActive: true },
    select: { slug: true },
  });
  return bundle?.slug ?? null;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
```

- [ ] **Step 2: Create grace period logic**

Create `src/lib/billing/grace-period.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export type GraceStatus =
  | { status: "current" }
  | { status: "warning"; daysOverdue: number }
  | { status: "urgent"; daysOverdue: number }
  | { status: "locked_bundles"; daysOverdue: number }
  | { status: "locked_all"; daysOverdue: number };

export async function getGraceStatus(agentId: string): Promise<GraceStatus> {
  const subscription = await prisma.subscription.findUnique({
    where: { agentId },
  });

  if (!subscription || subscription.status !== "past_due") {
    return { status: "current" };
  }

  // Check for admin override
  const override = await prisma.gracePeriodOverride.findFirst({
    where: {
      agentId,
      extendedUntil: { gt: new Date() },
    },
    orderBy: { extendedUntil: "desc" },
  });

  if (override) {
    return { status: "current" };
  }

  const settings = await getBillingSettings();
  const daysOverdue = Math.floor(
    (Date.now() - subscription.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOverdue <= settings.gracePeriodWarningDays) {
    return { status: "warning", daysOverdue };
  }

  if (daysOverdue <= settings.gracePeriodUrgentDays) {
    return { status: "urgent", daysOverdue };
  }

  // Check if base membership is the overdue item
  const hasActiveMembership = await prisma.subscriptionItem.findFirst({
    where: {
      subscription: { agentId },
      productType: "membership",
    },
  });

  if (hasActiveMembership) {
    return { status: "locked_all", daysOverdue };
  }

  return { status: "locked_bundles", daysOverdue };
}

export async function getBillingSettings() {
  const settings = await prisma.billingSettings.findFirst();
  return (
    settings ?? {
      gracePeriodWarningDays: 7,
      gracePeriodUrgentDays: 14,
      gracePeriodLockoutDays: 15,
      invoiceNotifyDays: 7,
      trialDurationDays: 14,
      transitionGraceDays: 30,
      loyaltyDiscountPercent: 20,
    }
  );
}
```

- [ ] **Step 3: Create Stripe sync utilities**

Create `src/lib/billing/stripe-sync.ts`:

```typescript
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function getOrCreateStripeCustomer(agentId: string): Promise<string> {
  const existing = await prisma.stripeCustomer.findUnique({ where: { agentId } });
  if (existing) return existing.stripeCustomerId;

  const agent = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const customer = await stripe.customers.create({
    name: `${agent.firstName} ${agent.lastName}`.trim(),
    email: agent.email || undefined,
    metadata: { agentId: agent.id },
  });

  await prisma.stripeCustomer.create({
    data: {
      agentId,
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!stripeCustomer) return;

  const agentId = stripeCustomer.agentId;

  await prisma.subscription.upsert({
    where: { agentId },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.items.data[0]?.current_period_start ?? Date.now()),
      currentPeriodEnd: new Date(stripeSubscription.items.data[0]?.current_period_end ?? Date.now()),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    },
    create: {
      agentId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.items.data[0]?.current_period_start ?? Date.now()),
      currentPeriodEnd: new Date(stripeSubscription.items.data[0]?.current_period_end ?? Date.now()),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    },
  });

  // Sync subscription items
  await prisma.subscriptionItem.deleteMany({
    where: { subscription: { agentId } },
  });

  const bundleConfigs = await prisma.bundleConfig.findMany({
    where: { isActive: true },
  });
  const priceToProductType = new Map<string, { productType: string; name: string }>();
  for (const b of bundleConfigs) {
    if (b.monthlyPriceId) priceToProductType.set(b.monthlyPriceId, { productType: b.productType, name: b.name });
    if (b.annualPriceId) priceToProductType.set(b.annualPriceId, { productType: b.productType, name: b.name });
  }

  const subscription = await prisma.subscription.findUnique({ where: { agentId } });
  if (!subscription) return;

  for (const item of stripeSubscription.items.data) {
    const priceId = typeof item.price === "string" ? item.price : item.price.id;
    const match = priceToProductType.get(priceId);

    await prisma.subscriptionItem.create({
      data: {
        subscriptionId: subscription.id,
        stripeItemId: item.id,
        productType: match?.productType ?? "unknown",
        productName: match?.name ?? "Unknown Product",
        stripePriceId: priceId,
        quantity: item.quantity ?? 1,
      },
    });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing/
git commit -m "feat(billing): add entitlement engine, grace period logic, and Stripe sync"
```

---

## Task 5: Stripe Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create webhook handler**

Create `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscriptionFromStripe(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialEnding(event.data.object as Stripe.Subscription);
        break;

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!stripeCustomer) return;

  await prisma.subscription.updateMany({
    where: { agentId: stripeCustomer.agentId },
    data: { status: "canceled" },
  });

  await prisma.subscriptionItem.deleteMany({
    where: { subscription: { agentId: stripeCustomer.agentId } },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "active" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "past_due" },
  });
}

async function handleTrialEnding(sub: Stripe.Subscription) {
  // TODO in future: Send email notification to agent about trial ending
  // For now, Stripe handles trial-end notifications via its built-in emails
  console.log(`Trial ending for subscription ${sub.id}`);
}
```

- [ ] **Step 2: Register webhook in Stripe Dashboard**

Go to https://dashboard.stripe.com/acct_1TEd05E4iljtkRl8/webhooks and:
1. Add endpoint: `https://<your-domain>/api/webhooks/stripe`
2. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.trial_will_end`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`

For local testing, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/
git commit -m "feat(billing): add Stripe webhook handler for subscription lifecycle"
```

---

## Task 6: Stripe Checkout & Billing API Routes

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`
- Create: `src/app/api/billing/portal/route.ts`
- Create: `src/app/api/billing/subscription/route.ts`

- [ ] **Step 1: Create checkout session API**

Create `src/app/api/billing/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getOrCreateStripeCustomer } from "@/lib/billing/stripe-sync";
import { checkoutSessionSchema } from "@/schemas/billing.schema";

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const profile = auth.profile;

  // Find the agent linked to this user
  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { email: profile.email ?? undefined },
        { userId: profile.id },
      ],
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "No agent profile found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = checkoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { bundles, addOns, billingInterval } = parsed.data;
  const customerId = await getOrCreateStripeCustomer(agent.id);

  // Build line items from bundle configs
  const bundleConfigs = await prisma.bundleConfig.findMany({
    where: { isActive: true },
  });

  const lineItems: { price: string; quantity: number }[] = [];

  // Always include base membership
  const membership = bundleConfigs.find((b) => b.productType === "membership");
  if (membership?.annualPriceId) {
    lineItems.push({ price: membership.annualPriceId, quantity: 1 });
  }

  // Add selected bundles
  for (const slug of bundles) {
    const bundle = bundleConfigs.find((b) => b.slug === slug);
    if (!bundle) continue;
    const priceId = billingInterval === "annual" ? bundle.annualPriceId : bundle.monthlyPriceId;
    if (priceId) lineItems.push({ price: priceId, quantity: 1 });
  }

  // Add selected add-ons
  for (const slug of addOns) {
    const addOn = bundleConfigs.find((b) => b.slug === slug);
    if (!addOn?.monthlyPriceId) continue;
    lineItems.push({ price: addOn.monthlyPriceId, quantity: 1 });
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "No valid items selected" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: lineItems,
    success_url: parsed.data.successUrl || `${siteUrl}/dashboard/billing?success=true`,
    cancel_url: parsed.data.cancelUrl || `${siteUrl}/pricing?canceled=true`,
    payment_method_types: ["card", "us_bank_account"],
    subscription_data: {
      metadata: { agentId: agent.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2: Create billing portal API**

Create `src/app/api/billing/portal/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { email: auth.profile.email ?? undefined },
        { userId: auth.profile.id },
      ],
    },
    include: { stripeCustomer: true },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: agent.stripeCustomer.stripeCustomerId,
    return_url: `${siteUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 3: Create subscription status API**

Create `src/app/api/billing/subscription/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { getGraceStatus } from "@/lib/billing/grace-period";

export async function GET() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { email: auth.profile.email ?? undefined },
        { userId: auth.profile.id },
      ],
    },
    include: {
      subscription: { include: { items: true } },
      stripeCustomer: true,
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "No agent profile found" }, { status: 404 });
  }

  const graceStatus = await getGraceStatus(agent.id);

  const bundles = await prisma.bundleConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { features: true },
  });

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`.trim(),
    },
    subscription: agent.subscription
      ? {
          status: agent.subscription.status,
          currentPeriodEnd: agent.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: agent.subscription.cancelAtPeriodEnd,
          trialEnd: agent.subscription.trialEnd,
          items: agent.subscription.items.map((item) => ({
            productType: item.productType,
            productName: item.productName,
          })),
        }
      : null,
    graceStatus,
    hasPaymentMethod: !!agent.stripeCustomer?.defaultPaymentMethod,
    availableBundles: bundles.map((b) => ({
      slug: b.slug,
      name: b.name,
      description: b.description,
      monthlyAmount: b.monthlyAmount,
      annualAmount: b.annualAmount,
      productType: b.productType,
      features: b.features.map((f) => f.featureKey),
    })),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/billing/
git commit -m "feat(billing): add checkout, portal, and subscription status API routes"
```

---

## Task 7: Admin Billing API Routes

**Files:**
- Create: `src/app/api/admin/billing/agents/route.ts`
- Create: `src/app/api/admin/billing/agents/[id]/route.ts`
- Create: `src/app/api/admin/billing/agents/[id]/payment/route.ts`
- Create: `src/app/api/admin/billing/agents/[id]/subscription/route.ts`
- Create: `src/app/api/admin/billing/agents/[id]/grace-period/route.ts`
- Create: `src/app/api/admin/billing/bundles/route.ts`
- Create: `src/app/api/admin/billing/bundles/[id]/route.ts`
- Create: `src/app/api/admin/billing/features/route.ts`
- Create: `src/app/api/admin/billing/features/[id]/route.ts`
- Create: `src/app/api/admin/billing/settings/route.ts`
- Create: `src/app/api/admin/billing/dashboard/route.ts`
- Create: `src/app/api/admin/billing/coupons/route.ts`

This task creates all admin API routes. Each follows the established pattern: `requireAdminApi()` → Zod validation → Prisma operation → JSON response.

- [ ] **Step 1: Create agent billing list + lookup endpoints**

`src/app/api/admin/billing/agents/route.ts` — GET returns paginated agent list with subscription status.

`src/app/api/admin/billing/agents/[id]/route.ts` — GET returns full billing profile for a specific agent (subscription, items, payment methods, payment history, upcoming invoice).

- [ ] **Step 2: Create payment processing endpoints**

`src/app/api/admin/billing/agents/[id]/payment/route.ts` — POST processes card/ACH payments or records cash/check payments on behalf of an agent. Uses `adminProcessCardPaymentSchema` and `adminRecordOfflinePaymentSchema` from the billing schemas.

For card payments, use `stripe.paymentIntents.create()` with the admin-provided payment method. For cash/check, create a `PaymentRecord` only (no Stripe charge). Set `processedBy` to the admin's user ID on all records.

- [ ] **Step 3: Create subscription management endpoints**

`src/app/api/admin/billing/agents/[id]/subscription/route.ts`:
- PUT: Add/remove bundles from an agent's subscription using `stripe.subscriptions.update()` with modified `items` array
- POST with `action: "comp"`: Create a 100% off coupon applied to the agent's subscription for a specified duration
- DELETE: Cancel subscription with `stripe.subscriptions.cancel()`

- [ ] **Step 4: Create grace period endpoint**

`src/app/api/admin/billing/agents/[id]/grace-period/route.ts` — POST creates a `GracePeriodOverride` record for the agent.

- [ ] **Step 5: Create bundle CRUD endpoints**

`src/app/api/admin/billing/bundles/route.ts`:
- GET: List all bundles (active + archived)
- POST: Create bundle → create Stripe Product + Prices → save to `BundleConfig`

`src/app/api/admin/billing/bundles/[id]/route.ts`:
- GET: Single bundle with features
- PUT: Update bundle config (for pricing changes, create new Stripe Prices)
- DELETE: Archive bundle (set `isActive: false`, keep Stripe Product)

- [ ] **Step 6: Create feature/entitlement CRUD endpoints**

`src/app/api/admin/billing/features/route.ts`:
- GET: List all entitlement configs
- POST: Create new feature entitlement

`src/app/api/admin/billing/features/[id]/route.ts`:
- PUT: Update feature config
- DELETE: Deactivate feature

- [ ] **Step 7: Create billing settings endpoint**

`src/app/api/admin/billing/settings/route.ts`:
- GET: Return current billing settings
- PUT: Update billing settings (grace period thresholds, trial duration, etc.)

- [ ] **Step 8: Create revenue dashboard endpoint**

`src/app/api/admin/billing/dashboard/route.ts` — GET returns aggregated billing metrics:

```typescript
// Query patterns:
const [activeCount, trialingCount, pastDueCount, canceledCount] = await Promise.all([
  prisma.subscription.count({ where: { status: "active" } }),
  prisma.subscription.count({ where: { status: "trialing" } }),
  prisma.subscription.count({ where: { status: "past_due" } }),
  prisma.subscription.count({ where: { status: "canceled" } }),
]);

// MRR: sum monthly amounts of active subscription items
const activeItems = await prisma.subscriptionItem.findMany({
  where: { subscription: { status: { in: ["active", "trialing"] } } },
  include: { subscription: true },
});

// Map each item's stripePriceId to its BundleConfig amount
```

- [ ] **Step 9: Create coupon management endpoint**

`src/app/api/admin/billing/coupons/route.ts`:
- GET: `stripe.coupons.list()`
- POST: `stripe.coupons.create()` validated against `couponCreateSchema`

- [ ] **Step 10: Commit**

```bash
git add src/app/api/admin/billing/
git commit -m "feat(billing): add admin billing API routes"
```

---

## Task 8: Seed Data (Bundles, Entitlements, Settings)

**Files:**
- Create: `prisma/seed-billing.ts`

- [ ] **Step 1: Create billing seed script**

Create `prisma/seed-billing.ts` that:
1. Creates Stripe Products and Prices for each bundle/add-on via `stripe.products.create()` and `stripe.prices.create()`
2. Saves the resulting IDs to `BundleConfig` records
3. Creates `EntitlementConfig` records for all gatable features
4. Creates `BundleFeature` records linking features to bundles
5. Creates a default `BillingSettings` record

Run it with:
```bash
npx tsx prisma/seed-billing.ts
```

This populates the database with the initial bundle structure from the spec (membership, AI Power Tools, Marketing Suite, Growth Engine, 4 add-ons) and all feature entitlements.

- [ ] **Step 2: Commit**

```bash
git add prisma/seed-billing.ts
git commit -m "feat(billing): add billing seed script for bundles and entitlements"
```

---

## Task 9: Admin Sidebar + Admin Billing Pages

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx` — add Billing section
- Modify: `src/components/admin/admin-sidebar-icons.tsx` — add billing icons
- Create: `src/app/admin/billing/page.tsx` — revenue dashboard
- Create: `src/app/admin/billing/agents/page.tsx` — agent billing list
- Create: `src/app/admin/billing/agents/[id]/page.tsx` — agent billing detail + payment processing
- Create: `src/app/admin/billing/bundles/page.tsx` — bundle management
- Create: `src/app/admin/billing/features/page.tsx` — feature entitlement management
- Create: `src/app/admin/billing/settings/page.tsx` — billing settings
- Create: `src/components/admin/billing/` — all billing admin components

- [ ] **Step 1: Add Billing section to admin sidebar**

In `src/components/admin/admin-sidebar.tsx`, add to `ADMIN_SECTIONS` array (between "Team" and "System"):

```typescript
{
  title: "Billing",
  items: [
    { href: "/admin/billing", label: "Revenue", icon: "chart", exact: true },
    { href: "/admin/billing/agents", label: "Agent Billing", icon: "credit-card" },
    { href: "/admin/billing/bundles", label: "Bundles", icon: "package" },
    { href: "/admin/billing/features", label: "Features", icon: "toggle" },
    { href: "/admin/billing/settings", label: "Billing Settings", icon: "gear" },
  ],
},
```

Add corresponding icons in `admin-sidebar-icons.tsx` for `credit-card`, `package`, and `toggle`.

- [ ] **Step 2: Create revenue dashboard page**

`src/app/admin/billing/page.tsx`: Async server component calling `requireAdmin()`, fetches data from the dashboard API, renders `StatCard` components for MRR, ARR, active subscribers, churn, past-due count. Follow the pattern from `src/app/admin/page.tsx`.

- [ ] **Step 3: Create agent billing list page**

`src/app/admin/billing/agents/page.tsx`: Server component with search/filter, paginated table of agents showing name, subscription status, active bundles, last payment date, amount. Link each row to the detail page.

- [ ] **Step 4: Create agent billing detail page**

`src/app/admin/billing/agents/[id]/page.tsx`: The core admin billing page. Server component that loads agent + subscription + payment history. Renders a client component with tabs:

1. **Overview tab**: Current plan, status, active bundles, upcoming invoice
2. **Payment Methods tab**: List saved cards/bank accounts, "Add Payment Method" button (Stripe Elements form), "Set as Autopay" toggle
3. **Process Payment tab**: Three action buttons — "Process Card Payment", "Process Bank Payment (ACH)", "Record Cash/Check Payment". Each opens a modal form.
4. **Payment History tab**: Table of all PaymentRecords for this agent
5. **Manage Subscription tab**: Add/remove bundles, extend grace period, comp/gift, cancel

- [ ] **Step 5: Create bundle management page**

`src/app/admin/billing/bundles/page.tsx`: List all bundles in a table with edit/archive actions. "Create Bundle" button opens a form modal. Edit form includes feature assignment (multi-select of EntitlementConfig keys).

- [ ] **Step 6: Create feature entitlement management page**

`src/app/admin/billing/features/page.tsx`: Table of all features with their assigned bundle, free-tier limit, and active toggle. Create/edit modals for feature configuration.

- [ ] **Step 7: Create billing settings page**

`src/app/admin/billing/settings/page.tsx`: Form with all BillingSettings fields (grace period thresholds, trial duration, etc.). Simple save button.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/billing/ src/components/admin/billing/ src/components/admin/admin-sidebar.tsx src/components/admin/admin-sidebar-icons.tsx
git commit -m "feat(billing): add admin billing pages and components"
```

---

## Task 10: Agent-Facing Pricing Page

**Files:**
- Create: `src/app/(public)/pricing/page.tsx`
- Create: `src/components/pricing/pricing-page.tsx`
- Create: `src/components/pricing/bundle-card.tsx`
- Create: `src/components/pricing/addon-card.tsx`

- [ ] **Step 1: Create pricing page**

`src/app/(public)/pricing/page.tsx`: Server component that loads active BundleConfigs from DB, renders the pricing page with:
- Hero section explaining the membership model
- Base membership fee card (annual, required)
- Three bundle cards (AI Power Tools, Marketing Suite, Growth Engine) with feature lists, monthly/annual toggle, and subscribe buttons
- À la carte add-ons section
- FAQ accordion

Each subscribe button calls `/api/billing/checkout` with the selected bundles/add-ons and redirects to Stripe Checkout.

- [ ] **Step 2: Create bundle card component**

`src/components/pricing/bundle-card.tsx`: Client component showing bundle name, description, price (monthly/annual toggle), feature list, and "Subscribe" button. Follows the existing `Card` component pattern.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/pricing/ src/components/pricing/
git commit -m "feat(billing): add public pricing page with bundle selection"
```

---

## Task 11: Agent Billing Dashboard

**Files:**
- Create: `src/app/dashboard/billing/page.tsx`
- Create: `src/components/billing/billing-dashboard.tsx`
- Create: `src/components/billing/subscription-status.tsx`
- Create: `src/components/billing/payment-history.tsx`

- [ ] **Step 1: Create agent billing dashboard**

`src/app/dashboard/billing/page.tsx`: Server component (requires auth) showing the agent's:
- Current subscription status and active bundles
- Next billing date and amount
- "Manage Subscription" button → redirects to Stripe Customer Portal via `/api/billing/portal`
- Payment history table
- "Upgrade" button → links to `/pricing`

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/billing/ src/components/billing/
git commit -m "feat(billing): add agent billing dashboard"
```

---

## Task 12: Feature Gating Integration

**Files:**
- Create: `src/components/billing/upgrade-prompt.tsx`
- Create: `src/components/billing/past-due-banner.tsx`
- Create: `src/lib/billing/check-feature.ts`

- [ ] **Step 1: Create reusable upgrade prompt component**

`src/components/billing/upgrade-prompt.tsx`: Client component displayed when a feature is gated. Shows which bundle unlocks it, remaining usage if on free tier, and a subscribe button.

```typescript
"use client";

interface UpgradePromptProps {
  featureName: string;
  bundleSlug: string | null;
  bundleName?: string;
  remaining?: number | null;
  limit?: number | null;
}

export function UpgradePrompt({ featureName, bundleSlug, bundleName, remaining, limit }: UpgradePromptProps) {
  // Renders a card with:
  // - "Upgrade to unlock {featureName}"
  // - If remaining != null: "You've used {limit - remaining} of {limit} this month"
  // - "Subscribe to {bundleName}" button linking to /pricing
}
```

- [ ] **Step 2: Create past-due banner component**

`src/components/billing/past-due-banner.tsx`: Persistent banner shown in the admin layout when an agent's payment is past due. Three severity levels based on `GraceStatus`:

- `warning`: Blue/info banner — "Your payment is past due. Please update your payment method."
- `urgent`: Yellow/warning banner — "Your payment is {N} days overdue. Features will be restricted soon."
- `locked_bundles`/`locked_all`: Red/critical banner — "Your account is restricted due to unpaid balance."

- [ ] **Step 3: Create server-side feature check helper**

`src/lib/billing/check-feature.ts`: Helper function for use in server components and API routes:

```typescript
import { checkEntitlement, incrementUsage } from "@/lib/billing/entitlements";
import type { EntitlementCheck } from "@/lib/billing/entitlements";

export async function checkFeatureAccess(
  agentId: string,
  featureKey: string
): Promise<EntitlementCheck> {
  return checkEntitlement(agentId, featureKey);
}

export async function useFeature(
  agentId: string,
  featureKey: string
): Promise<EntitlementCheck> {
  const check = await checkEntitlement(agentId, featureKey);
  if (check.allowed) {
    await incrementUsage(agentId, featureKey);
  }
  return check;
}
```

- [ ] **Step 4: Integrate past-due banner into admin layout**

Modify the dashboard layout to check the agent's grace status and render the `PastDueBanner` component when applicable.

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/ src/lib/billing/check-feature.ts
git commit -m "feat(billing): add upgrade prompts, past-due banners, and feature gating helpers"
```

---

## Task 13: Integration Testing & Verification

**Files:**
- Create: `src/lib/billing/__tests__/entitlements.test.ts`
- Create: `src/lib/billing/__tests__/grace-period.test.ts`

- [ ] **Step 1: Write entitlement engine tests**

Test the core business logic with Vitest:
- Agent with bundle → feature allowed (unlimited)
- Agent without bundle, under free limit → allowed with remaining count
- Agent without bundle, at free limit → blocked with upgrade prompt
- Feature not configured → allowed by default
- Feature with no requiredProduct → free for all

- [ ] **Step 2: Write grace period tests**

- Subscription active → status "current"
- Subscription past_due, day 3 → status "warning"
- Subscription past_due, day 10 → status "urgent"
- Subscription past_due, day 20 → status "locked_bundles" or "locked_all"
- Admin override exists → status "current" regardless of days overdue

- [ ] **Step 3: Run tests**

```bash
npm run test:run
```

- [ ] **Step 4: End-to-end verification**

1. Run the seed script: `npx tsx prisma/seed-billing.ts`
2. Start the dev server: `npm run dev`
3. Verify pricing page renders at `/pricing`
4. Verify admin billing pages load at `/admin/billing`
5. Test Stripe Checkout flow with test card `4242 4242 4242 4242`
6. Verify webhook processes the subscription
7. Verify entitlements update after subscription activates
8. Test admin payment processing (card, cash/check)
9. Verify feature gating works (test a gated feature)

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/__tests__/
git commit -m "test(billing): add entitlement and grace period tests"
```

---

## File Map Summary

```
src/
├── lib/
│   ├── stripe.ts                              (Stripe client singleton)
│   └── billing/
│       ├── entitlements.ts                    (Entitlement checking + usage tracking)
│       ├── grace-period.ts                    (Grace period status + settings)
│       ├── stripe-sync.ts                     (Stripe ↔ DB synchronization)
│       ├── check-feature.ts                   (Server-side feature access helper)
│       └── __tests__/
│           ├── entitlements.test.ts
│           └── grace-period.test.ts
├── schemas/
│   └── billing.schema.ts                      (All Zod schemas for billing)
├── app/
│   ├── api/
│   │   ├── webhooks/stripe/route.ts           (Stripe webhook handler)
│   │   ├── billing/
│   │   │   ├── checkout/route.ts              (Checkout session creation)
│   │   │   ├── portal/route.ts                (Customer portal redirect)
│   │   │   └── subscription/route.ts          (Agent subscription status)
│   │   └── admin/billing/
│   │       ├── agents/route.ts                (Agent billing list)
│   │       ├── agents/[id]/route.ts           (Agent billing detail)
│   │       ├── agents/[id]/payment/route.ts   (Process payments)
│   │       ├── agents/[id]/subscription/route.ts (Manage subscription)
│   │       ├── agents/[id]/grace-period/route.ts (Grace period override)
│   │       ├── bundles/route.ts               (Bundle CRUD)
│   │       ├── bundles/[id]/route.ts          (Single bundle)
│   │       ├── features/route.ts              (Entitlement CRUD)
│   │       ├── features/[id]/route.ts         (Single feature)
│   │       ├── settings/route.ts              (Billing settings)
│   │       ├── dashboard/route.ts             (Revenue metrics)
│   │       └── coupons/route.ts               (Coupon management)
│   ├── (public)/pricing/page.tsx              (Public pricing page)
│   ├── dashboard/billing/page.tsx             (Agent billing dashboard)
│   └── admin/billing/
│       ├── page.tsx                           (Revenue dashboard)
│       ├── agents/page.tsx                    (Agent billing list)
│       ├── agents/[id]/page.tsx               (Agent billing detail)
│       ├── bundles/page.tsx                   (Bundle management)
│       ├── features/page.tsx                  (Feature management)
│       └── settings/page.tsx                  (Billing settings)
├── components/
│   ├── admin/
│   │   ├── admin-sidebar.tsx                  (Modified: add Billing section)
│   │   ├── admin-sidebar-icons.tsx            (Modified: add billing icons)
│   │   └── billing/                           (Admin billing components)
│   ├── billing/
│   │   ├── billing-dashboard.tsx              (Agent billing view)
│   │   ├── subscription-status.tsx            (Subscription status card)
│   │   ├── payment-history.tsx                (Payment history table)
│   │   ├── upgrade-prompt.tsx                 (Feature gate upgrade card)
│   │   └── past-due-banner.tsx                (Past-due warning banner)
│   └── pricing/
│       ├── pricing-page.tsx                   (Pricing page layout)
│       ├── bundle-card.tsx                    (Bundle selection card)
│       └── addon-card.tsx                     (Add-on selection card)
└── prisma/
    ├── schema.prisma                          (Modified: add billing models)
    └── seed-billing.ts                        (Seed bundles + entitlements)
```
