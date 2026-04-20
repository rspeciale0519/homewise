import { NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { getGraceStatus } from "@/lib/billing/grace-period";

export async function GET() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const { user } = auth;

  const agent = await prisma.agent.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email ?? "" }],
    },
    include: {
      subscription: {
        include: { items: true },
      },
      stripeCustomer: true,
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const [graceStatus, availableBundles] = await Promise.all([
    getGraceStatus(agent.id),
    prisma.productConfig.findMany({
      where: { isActive: true },
      include: { features: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return NextResponse.json({
    agent: {
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
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
            stripePriceId: item.stripePriceId,
            quantity: item.quantity,
          })),
        }
      : null,
    graceStatus,
    availableBundles: availableBundles.map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description,
      productType: bundle.productType,
      monthlyAmount: bundle.monthlyAmount,
      annualAmount: bundle.annualAmount,
      sortOrder: bundle.sortOrder,
      features: bundle.features.map((f) => ({
        id: f.id,
        featureKey: f.featureKey,
        limit: f.limit,
      })),
    })),
  });
}
