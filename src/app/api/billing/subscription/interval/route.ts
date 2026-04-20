import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";

export async function PUT(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: { email: auth.profile.email ?? undefined },
    include: { stripeCustomer: true, subscription: { include: { items: true } } },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  if (!agent.subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !["monthly", "annual"].includes(
      (body as Record<string, unknown>).interval as string,
    )
  ) {
    return NextResponse.json(
      { error: 'interval must be "monthly" or "annual"' },
      { status: 400 },
    );
  }

  const { interval } = body as { interval: "monthly" | "annual" };

  try {
    const existingItems = agent.subscription.items;
    const stripeSubscriptionId = agent.subscription.stripeSubscriptionId;

    // Load all active product configs to map current price IDs to new interval price IDs
    const productConfigs = await prisma.productConfig.findMany({
      where: { isActive: true },
    });

    const priceToProduct = new Map(
      productConfigs.flatMap((product) => {
        const entries: [string, typeof product][] = [];
        if (product.monthlyPriceId) entries.push([product.monthlyPriceId, product]);
        if (product.annualPriceId) entries.push([product.annualPriceId, product]);
        return entries;
      }),
    );

    const itemUpdates: { id: string; price: string }[] = [];

    for (const item of existingItems) {
      const product = priceToProduct.get(item.stripePriceId);
      if (!product) {
        // Unknown price — keep as-is by not touching it, skip
        continue;
      }

      const targetPriceId =
        interval === "annual"
          ? (product.annualPriceId ?? product.monthlyPriceId)
          : (product.monthlyPriceId ?? product.annualPriceId);

      if (!targetPriceId) {
        return NextResponse.json(
          { error: `No ${interval} price configured for bundle: ${product.slug}` },
          { status: 400 },
        );
      }

      // Only update if the price is actually changing
      if (targetPriceId !== item.stripePriceId) {
        itemUpdates.push({ id: item.stripeItemId, price: targetPriceId });
      }
    }

    if (itemUpdates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Subscription already on the requested interval",
      });
    }

    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: itemUpdates,
      proration_behavior: "always_invoice",
    });

    await syncSubscriptionFromStripe(updated);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update billing interval", detail: message },
      { status: 500 },
    );
  }
}
