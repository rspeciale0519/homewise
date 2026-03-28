import { prisma } from "@/lib/prisma";

export interface EntitlementCheck {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  upgradeBundle: string | null;
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
): Promise<number> {
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
    orderBy: { sortOrder: "asc" },
  });
  return bundle?.slug ?? null;
}

export async function checkEntitlement(
  agentId: string,
  featureKey: string,
): Promise<EntitlementCheck> {
  const config = await prisma.entitlementConfig.findUnique({
    where: { featureKey },
  });

  if (!config || !config.isActive || !config.requiredProduct) {
    return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
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

  const upgradeBundle = await getUpgradeBundleSlug(config.requiredProduct);

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
