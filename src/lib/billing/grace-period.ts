import { prisma } from "@/lib/prisma";

export type GraceStatus =
  | { status: "current" }
  | { status: "warning"; daysOverdue: number }
  | { status: "urgent"; daysOverdue: number }
  | { status: "locked_bundles"; daysOverdue: number }
  | { status: "locked_all"; daysOverdue: number };

interface BillingSettingsDefaults {
  gracePeriodWarningDays: number;
  gracePeriodUrgentDays: number;
  gracePeriodLockoutDays: number;
}

async function getBillingSettings(): Promise<BillingSettingsDefaults> {
  const settings = await prisma.billingSettings.findFirst();

  return {
    gracePeriodWarningDays: settings?.gracePeriodWarningDays ?? 7,
    gracePeriodUrgentDays: settings?.gracePeriodUrgentDays ?? 14,
    gracePeriodLockoutDays: settings?.gracePeriodLockoutDays ?? 15,
  };
}

export async function getGraceStatus(agentId: string): Promise<GraceStatus> {
  const subscription = await prisma.subscription.findUnique({
    where: { agentId },
  });

  if (!subscription || subscription.status !== "past_due") {
    return { status: "current" };
  }

  const now = new Date();

  const override = await prisma.gracePeriodOverride.findFirst({
    where: {
      agentId,
      extendedUntil: { gte: now },
    },
    orderBy: { extendedUntil: "desc" },
  });

  if (override) {
    return { status: "current" };
  }

  const periodEnd = subscription.currentPeriodEnd;
  const msOverdue = now.getTime() - periodEnd.getTime();
  const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));

  const settings = await getBillingSettings();

  if (daysOverdue >= settings.gracePeriodLockoutDays) {
    return { status: "locked_all", daysOverdue };
  }

  if (daysOverdue >= settings.gracePeriodUrgentDays) {
    return { status: "locked_bundles", daysOverdue };
  }

  if (daysOverdue >= settings.gracePeriodWarningDays) {
    return { status: "urgent", daysOverdue };
  }

  return { status: "warning", daysOverdue };
}
