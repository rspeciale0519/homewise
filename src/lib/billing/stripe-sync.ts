import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

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

  const customer = await stripe.customers.create({
    name: `${agent.firstName} ${agent.lastName}`,
    email: agent.email ?? undefined,
    metadata: {
      agentId,
      slug: agent.slug,
    },
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
  stripeSubscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!stripeCustomer) {
    return;
  }

  const { agentId } = stripeCustomer;

  // In Stripe API 2024-11-20+, current_period_start/end moved from Subscription
  // to SubscriptionItem. Derive billing period from the first item.
  const firstItem = stripeSubscription.items.data[0];
  const periodStart = firstItem
    ? new Date(firstItem.current_period_start * 1000)
    : new Date(stripeSubscription.start_date * 1000);
  const periodEnd = firstItem
    ? new Date(firstItem.current_period_end * 1000)
    : new Date(stripeSubscription.start_date * 1000);

  await prisma.subscription.upsert({
    where: { agentId },
    create: {
      agentId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    },
  });

  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { agentId },
  });

  await prisma.subscriptionItem.deleteMany({
    where: { subscriptionId: subscription.id },
  });

  const bundleConfigs = await prisma.bundleConfig.findMany({
    where: { isActive: true },
  });

  const priceToBundle = new Map(
    bundleConfigs.flatMap((bundle) => {
      const entries: [string, typeof bundle][] = [];
      if (bundle.monthlyPriceId) entries.push([bundle.monthlyPriceId, bundle]);
      if (bundle.annualPriceId) entries.push([bundle.annualPriceId, bundle]);
      return entries;
    }),
  );

  const itemsToCreate = stripeSubscription.items.data
    .map((item) => {
      const priceId =
        typeof item.price === "string" ? item.price : item.price.id;
      const bundle = priceToBundle.get(priceId);

      return {
        subscriptionId: subscription.id,
        stripeItemId: item.id,
        productType: bundle?.productType ?? "unknown",
        productName: bundle?.name ?? "Unknown Product",
        stripePriceId: priceId,
        quantity: item.quantity ?? 1,
      };
    });

  if (itemsToCreate.length > 0) {
    await prisma.subscriptionItem.createMany({ data: itemsToCreate });
  }
}
