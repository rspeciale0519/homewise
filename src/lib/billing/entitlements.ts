import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveAgentPlatform } from "@/lib/platform/filter";

export interface EntitlementCheck {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  upgradeBundle: string | null;
}

export type EntitlementDatabase = Pick<
  Prisma.TransactionClient,
  | "agent"
  | "entitlementConfig"
  | "productConfig"
  | "productFeature"
  | "subscription"
  | "usageRecord"
>;

export interface EntitlementOptions {
  /** Paid API routes must not become free when billing configuration is absent. */
  requireActiveConfig?: boolean;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

async function getUsageCount(
  agentId: string,
  featureKey: string,
  periodStart: Date,
  database: EntitlementDatabase,
): Promise<number> {
  const record = await database.usageRecord.findUnique({
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

async function getUpgradeBundleSlug(
  productType: string,
  platform: string,
  database: EntitlementDatabase,
): Promise<string | null> {
  const product = await database.productConfig.findFirst({
    where: { productType, isActive: true, platforms: { has: platform } },
    orderBy: { sortOrder: "asc" },
  });
  return product?.slug ?? null;
}

export async function checkEntitlement(
  agentId: string,
  featureKey: string,
  database: EntitlementDatabase = prisma,
  options: EntitlementOptions = {},
): Promise<EntitlementCheck> {
  const agent = await database.agent.findUnique({
    where: { id: agentId },
    select: { platform: true },
  });
  const platform = resolveAgentPlatform(agent);

  const config = await database.entitlementConfig.findUnique({
    where: { featureKey },
  });

  if (!config || !config.isActive || !config.requiredProduct) {
    if (options.requireActiveConfig) {
      return { allowed: false, remaining: 0, limit: null, upgradeBundle: null };
    }
    return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
  }

  if (!config.platforms.includes(platform)) {
    return { allowed: false, remaining: 0, limit: null, upgradeBundle: null };
  }

  const subscription = await database.subscription.findUnique({
    where: { agentId },
    include: { items: true },
  });

  const activeStatuses = ["active", "trialing"];
  const subscribedProductItems = subscription?.items.filter(
    (item) => item.productType === config.requiredProduct,
  ) ?? [];
  const hasProduct = Boolean(
    subscription &&
    activeStatuses.includes(subscription.status) &&
    subscribedProductItems.length > 0,
  );

  if (hasProduct && subscription) {
    const subscribedPriceIds = subscribedProductItems
      .map((item) => item.stripePriceId)
      .filter((priceId): priceId is string => typeof priceId === "string");
    const productFeature = await database.productFeature.findFirst({
      where: {
        featureKey,
        product: {
          productType: config.requiredProduct,
          ...(subscribedPriceIds.length > 0
            ? {
                OR: [
                  { monthlyPriceId: { in: subscribedPriceIds } },
                  { annualPriceId: { in: subscribedPriceIds } },
                ],
              }
            : {}),
        },
      },
    });

    if (productFeature?.limit === null) {
      return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
    }

    if (productFeature) {
      const periodStart = subscription.currentPeriodStart;
      const usageCount = await getUsageCount(agentId, featureKey, periodStart, database);
      const remaining = productFeature.limit - usageCount;

      return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        limit: productFeature.limit,
        upgradeBundle: null,
      };
    }
  }

  if (config.freeLimit !== null && config.freeLimit !== undefined) {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const usageCount = await getUsageCount(agentId, featureKey, periodStart, database);
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

  const upgradeBundle = await getUpgradeBundleSlug(config.requiredProduct, platform, database);

  return {
    allowed: false,
    remaining: 0,
    limit: config.freeLimit ?? null,
    upgradeBundle,
  };
}

export async function incrementUsage(
  agentId: string,
  featureKey: string,
  database: EntitlementDatabase = prisma,
): Promise<void> {
  const now = new Date();
  const [config, subscription] = await Promise.all([
    database.entitlementConfig.findUnique({ where: { featureKey } }),
    database.subscription.findUnique({
      where: { agentId },
      include: { items: true },
    }),
  ]);
  const usesActiveRequiredProduct = Boolean(
    config?.requiredProduct &&
    subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    subscription.items.some((item) => item.productType === config.requiredProduct),
  );
  const periodStart = usesActiveRequiredProduct && subscription
    ? subscription.currentPeriodStart
    : startOfMonth(now);
  const periodEnd = usesActiveRequiredProduct && subscription
    ? subscription.currentPeriodEnd
    : endOfMonth(now);

  await database.usageRecord.upsert({
    where: {
      agentId_featureKey_billingPeriodStart: {
        agentId,
        featureKey,
        billingPeriodStart: periodStart,
      },
    },
    create: {
      agentId,
      featureKey,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      usageCount: 1,
    },
    update: {
      usageCount: { increment: 1 },
      billingPeriodEnd: periodEnd,
    },
  });
}
