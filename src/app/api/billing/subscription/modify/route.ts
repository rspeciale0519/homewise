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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { addBundles, removeBundles } = body as {
    addBundles?: unknown;
    removeBundles?: unknown;
  };

  if (
    !Array.isArray(addBundles) ||
    !Array.isArray(removeBundles) ||
    addBundles.some((s) => typeof s !== "string") ||
    removeBundles.some((s) => typeof s !== "string")
  ) {
    return NextResponse.json(
      { error: "addBundles and removeBundles must be string arrays" },
      { status: 400 },
    );
  }

  const slugsToAdd = addBundles as string[];
  const slugsToRemove = removeBundles as string[];

  try {
    const bundleConfigs = await prisma.bundleConfig.findMany({
      where: {
        isActive: true,
        slug: { in: [...slugsToAdd, ...slugsToRemove] },
      },
    });

    const bundleBySlug = new Map(bundleConfigs.map((b) => [b.slug, b]));

    const stripeSubscriptionId = agent.subscription.stripeSubscriptionId;
    const existingItems = agent.subscription.items;

    // Build price-to-stripeItemId map from current subscription items
    const priceToItemId = new Map(
      existingItems.map((item) => [item.stripePriceId, item.stripeItemId]),
    );

    const itemUpdates: {
      id?: string;
      price?: string;
      deleted?: boolean;
    }[] = [];

    // Keep existing items that are not being removed
    for (const item of existingItems) {
      const isBeingRemoved = slugsToRemove.some((slug) => {
        const bundle = bundleBySlug.get(slug);
        return (
          bundle?.monthlyPriceId === item.stripePriceId ||
          bundle?.annualPriceId === item.stripePriceId
        );
      });

      if (isBeingRemoved) {
        itemUpdates.push({ id: item.stripeItemId, deleted: true });
      } else {
        itemUpdates.push({ id: item.stripeItemId });
      }
    }

    // Add new items for bundles being added
    for (const slug of slugsToAdd) {
      const bundle = bundleBySlug.get(slug);
      if (!bundle) {
        return NextResponse.json(
          { error: `Bundle not found: ${slug}` },
          { status: 400 },
        );
      }

      // Determine which price to use: prefer the same interval as an existing item
      // Fall back to monthly if no existing items
      const existingPriceIds = existingItems.map((i) => i.stripePriceId);
      const usesAnnual = existingPriceIds.some((p) =>
        bundleConfigs.some((b) => b.annualPriceId === p),
      );

      const priceId = usesAnnual
        ? (bundle.annualPriceId ?? bundle.monthlyPriceId)
        : (bundle.monthlyPriceId ?? bundle.annualPriceId);

      if (!priceId) {
        return NextResponse.json(
          { error: `No price configured for bundle: ${slug}` },
          { status: 400 },
        );
      }

      // Skip if already subscribed
      if (!priceToItemId.has(priceId)) {
        itemUpdates.push({ price: priceId });
      }
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
      { error: "Failed to modify subscription", detail: message },
      { status: 500 },
    );
  }
}
