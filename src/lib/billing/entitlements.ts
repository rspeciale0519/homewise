import { prisma } from "@/lib/prisma";
import { resolveAgentPlatform } from "@/lib/platform/filter";

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

async function getUpgradeBundleSlug(
  productType: string,
  platform: string,
): Promise<string | null> {
  const product = await prisma.productConfig.findFirst({
    where: { productType, isActive: true, platforms: { has: platform } },
    orderBy: { sortOrder: "asc" },
  });
  return product?.slug ?? null;
}

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
    const productFeature = await prisma.productFeature.findFirst({
      where: {
        featureKey,
        product: { productType: config.requiredProduct, isActive: true },
      },
    });

    if (!productFeature || productFeature.limit === null) {
      return { allowed: true, remaining: null, limit: null, upgradeBundle: null };
    }

    const periodStart = subscription.currentPeriodStart;
    const usageCount = await getUsageCount(agentId, featureKey, periodStart);
    const remaining = productFeature.limit - usageCount;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: productFeature.limit,
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
