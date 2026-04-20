import { NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const [
      activeCount,
      trialingCount,
      pastDueCount,
      canceledCount,
      pastDueAgents,
      subscriptionItems,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.subscription.count({ where: { status: "trialing" } }),
      prisma.subscription.count({ where: { status: "past_due" } }),
      prisma.subscription.count({ where: { status: "canceled" } }),
      prisma.agent.findMany({
        where: { subscription: { status: "past_due" } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
      }),
      prisma.subscriptionItem.findMany({
        where: {
          subscription: { status: { in: ["active", "trialing"] } },
        },
        select: {
          productType: true,
          stripePriceId: true,
        },
      }),
    ]);

    // Calculate MRR from active subscription items by looking up product prices
    const bundleConfigs = await prisma.productConfig.findMany({
      where: { isActive: true },
    });

    const priceToAmount = new Map<string, { monthly: number; annual: number }>();
    for (const bundle of bundleConfigs) {
      if (bundle.monthlyPriceId) {
        priceToAmount.set(bundle.monthlyPriceId, {
          monthly: bundle.monthlyAmount,
          annual: bundle.annualAmount,
        });
      }
      if (bundle.annualPriceId) {
        priceToAmount.set(bundle.annualPriceId, {
          monthly: bundle.monthlyAmount,
          annual: bundle.annualAmount,
        });
      }
    }

    let totalMrr = 0;
    const revenueByBundle: Record<string, number> = {};

    for (const item of subscriptionItems) {
      const amounts = priceToAmount.get(item.stripePriceId);
      if (!amounts) continue;

      // If price is annual, divide by 12 for MRR
      const isAnnual = bundleConfigs.some(
        (b) => b.annualPriceId === item.stripePriceId,
      );
      const mrr = isAnnual
        ? Math.round(amounts.annual / 12)
        : amounts.monthly;

      totalMrr += mrr;
      revenueByBundle[item.productType] =
        (revenueByBundle[item.productType] ?? 0) + mrr;
    }

    return NextResponse.json({
      metrics: {
        activeCount,
        trialingCount,
        pastDueCount,
        canceledCount,
        totalMrr,
      },
      pastDueAgents,
      revenueByBundle,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
