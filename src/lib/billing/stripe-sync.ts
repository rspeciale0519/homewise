import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}

export function getStripeSubscriptionPeriodBounds(
  stripeSubscription: Stripe.Subscription,
): { periodStart: Date; periodEnd: Date } {
  const items = stripeSubscription.items.data;
  const fallback = stripeSubscription.start_date;
  const periodStartSeconds = items.length > 0
    ? Math.max(...items.map((item) => item.current_period_start))
    : fallback;
  const periodEndSeconds = items.length > 0
    ? Math.min(...items.map((item) => item.current_period_end))
    : fallback;

  return {
    periodStart: new Date(periodStartSeconds * 1000),
    periodEnd: new Date(periodEndSeconds * 1000),
  };
}

export async function getOrCreateStripeCustomer(agentId: string): Promise<string> {
  const existing = await prisma.stripeCustomer.findUnique({
    where: { agentId },
  });

  if (existing) {
    return existing.stripeCustomerId;
  }

  const agent = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
  });

  const customer = await stripe.customers.create(
    {
      name: `${agent.firstName} ${agent.lastName}`,
      email: agent.email ?? undefined,
      metadata: {
        agentId,
        slug: agent.slug,
      },
    },
    { idempotencyKey: `agent-stripe-customer:${agentId}` },
  );

  try {
    await prisma.stripeCustomer.create({
      data: {
        agentId,
        stripeCustomerId: customer.id,
      },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;

    const winner = await prisma.stripeCustomer.findUnique({
      where: { agentId },
    });
    if (!winner) throw error;
    return winner.stripeCustomerId;
  }

  return customer.id;
}

export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  transaction?: Prisma.TransactionClient,
): Promise<void> {
  const db = transaction ?? prisma;
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const stripeCustomer = await db.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!stripeCustomer) {
    return;
  }

  const { agentId } = stripeCustomer;

  // Stripe defines the subscription period as the latest item start and earliest
  // item end when item intervals differ.
  const { periodStart, periodEnd } = getStripeSubscriptionPeriodBounds(stripeSubscription);
  const trialEnd = stripeSubscription.trial_end
    ? new Date(stripeSubscription.trial_end * 1000)
    : null;
  const hasScheduledCancellation =
    stripeSubscription.cancel_at_period_end || typeof stripeSubscription.cancel_at === "number";

  const stripePriceIds = stripeSubscription.items.data.map((item) =>
    typeof item.price === "string" ? item.price : item.price.id,
  );
  const productConfigs = await db.productConfig.findMany({
    where: {
      OR: [
        { monthlyPriceId: { in: stripePriceIds } },
        { annualPriceId: { in: stripePriceIds } },
      ],
    },
  });

  const priceToBundle = new Map(
    productConfigs.flatMap((bundle) => {
      const entries: [string, typeof bundle][] = [];
      if (bundle.monthlyPriceId) entries.push([bundle.monthlyPriceId, bundle]);
      if (bundle.annualPriceId) entries.push([bundle.annualPriceId, bundle]);
      return entries;
    }),
  );

  const items = stripeSubscription.status === "canceled"
    ? []
    : stripeSubscription.items.data.map((item) => {
        const priceId =
          typeof item.price === "string" ? item.price : item.price.id;
        const bundle = priceToBundle.get(priceId);

        return {
          stripeItemId: item.id,
          productType: bundle?.productType ?? "unknown",
          productName: bundle?.name ?? "Unknown Product",
          stripePriceId: priceId,
          quantity: item.quantity ?? 1,
        };
      });

  const writeSubscription = async (tx: Prisma.TransactionClient) => {
    const subscription = await tx.subscription.upsert({
      where: { agentId },
      create: {
        agentId,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: hasScheduledCancellation,
        trialEnd,
      },
      update: {
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: hasScheduledCancellation,
        trialEnd,
      },
    });

    await tx.subscriptionItem.deleteMany({
      where: { subscriptionId: subscription.id },
    });

    if (items.length > 0) {
      await tx.subscriptionItem.createMany({
        data: items.map((item) => ({
          subscriptionId: subscription.id,
          ...item,
        })),
      });
    }
  };

  if (transaction) {
    await writeSubscription(transaction);
  } else {
    await prisma.$transaction(writeSubscription);
  }
}
