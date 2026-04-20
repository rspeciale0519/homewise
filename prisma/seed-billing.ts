import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { PRODUCTS, ENTITLEMENTS, BUNDLE_FEATURES } from "./seed-billing-data";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

// ─── Stripe Helpers ───────────────────────────────────────────────────────────

async function getOrCreateStripeProduct(
  name: string,
  description: string,
  metadata: Record<string, string>
): Promise<string> {
  const existing = await stripe.products.search({
    query: `name:"${name}" AND active:"true"`,
    limit: 1,
  });

  const first = existing.data[0];
  if (first) {
    console.log(`  Stripe product already exists: ${name} (${first.id})`);
    return first.id;
  }

  const product = await stripe.products.create({ name, description, metadata });
  console.log(`  Created Stripe product: ${name} (${product.id})`);
  return product.id;
}

async function getOrCreateStripePrice(
  productId: string,
  amount: number,
  interval: "month" | "year",
  nickname: string
): Promise<string> {
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    type: "recurring",
    limit: 100,
  });

  const match = existing.data.find(
    (p) => p.unit_amount === amount && p.recurring?.interval === interval
  );

  if (match) {
    console.log(`  Stripe price already exists: ${nickname} (${match.id})`);
    return match.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    nickname,
  });
  console.log(`  Created Stripe price: ${nickname} (${price.id})`);
  return price.id;
}

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function seedBilling() {
  console.log("Seeding billing data...\n");

  // ── 1. BundleConfig — Stripe Products/Prices + DB records ───────────────────
  console.log("1. Seeding BundleConfig records...");

  const orphan = await prisma.bundleConfig.deleteMany({
    where: { slug: "annual_brokerage_membership" },
  });
  if (orphan.count > 0) {
    console.log(`  Removed ${orphan.count} legacy 'annual_brokerage_membership' row(s)`);
  }

  for (const product of PRODUCTS) {
    console.log(`\n  Processing: ${product.name}`);

    const stripeProductId = await getOrCreateStripeProduct(
      product.name,
      product.description,
      { slug: product.slug, productType: product.productType }
    );

    let monthlyPriceId: string | null = null;
    let annualPriceId: string | null = null;

    if (product.hasMonthly && product.monthlyAmount > 0) {
      monthlyPriceId = await getOrCreateStripePrice(
        stripeProductId,
        product.monthlyAmount,
        "month",
        `${product.name} — Monthly`
      );
    }

    if (product.hasAnnual && product.annualAmount > 0) {
      annualPriceId = await getOrCreateStripePrice(
        stripeProductId,
        product.annualAmount,
        "year",
        `${product.name} — Annual`
      );
    }

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

    console.log(`  Upserted BundleConfig: ${product.slug}`);
  }

  // ── 2. EntitlementConfig records ─────────────────────────────────────────────
  console.log("\n2. Seeding EntitlementConfig records...");

  for (const entitlement of ENTITLEMENTS) {
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
    console.log(`  Upserted EntitlementConfig: ${entitlement.featureKey}`);
  }

  // ── 3. BundleFeature records ──────────────────────────────────────────────────
  console.log("\n3. Seeding BundleFeature records...");

  for (const [bundleSlug, featureKeys] of Object.entries(BUNDLE_FEATURES)) {
    const bundle = await prisma.bundleConfig.findUnique({
      where: { slug: bundleSlug },
    });

    if (!bundle) {
      console.warn(`  WARNING: BundleConfig not found for slug "${bundleSlug}" — skipping`);
      continue;
    }

    for (const featureKey of featureKeys) {
      await prisma.bundleFeature.upsert({
        where: { bundleId_featureKey: { bundleId: bundle.id, featureKey } },
        update: { limit: null },
        create: { bundleId: bundle.id, featureKey, limit: null },
      });
      console.log(`  Upserted BundleFeature: ${bundleSlug} → ${featureKey}`);
    }
  }

  // ── 4. BillingSettings singleton ─────────────────────────────────────────────
  console.log("\n4. Seeding BillingSettings...");

  const existingSettings = await prisma.billingSettings.findFirst();

  if (existingSettings) {
    console.log(`  BillingSettings already exists (id: ${existingSettings.id}) — skipping`);
  } else {
    const settings = await prisma.billingSettings.create({
      data: {
        gracePeriodWarningDays: 7,
        gracePeriodUrgentDays: 14,
        gracePeriodLockoutDays: 15,
        invoiceNotifyDays: 7,
        trialDurationDays: 14,
        transitionGraceDays: 30,
        loyaltyDiscountPercent: 20,
      },
    });
    console.log(`  Created BillingSettings (id: ${settings.id})`);
  }

  console.log("\nBilling seed complete!");
}

seedBilling()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
