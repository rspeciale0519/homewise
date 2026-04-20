import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { adminModifySubscriptionSchema } from "@/schemas/billing.schema";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminModifySubscriptionSchema.safeParse({
    ...(body as Record<string, unknown>),
    agentId: id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { addBundles, removeBundles } = parsed.data;

  const subscription = await prisma.subscription.findUnique({
    where: { agentId: id },
    include: { items: true },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 },
    );
  }

  try {
    const productConfigs = await prisma.productConfig.findMany({
      where: { isActive: true },
    });

    const itemUpdates: { id?: string; price?: string; deleted?: boolean }[] =
      [];

    // Remove bundles
    for (const slug of removeBundles) {
      const product = productConfigs.find((b) => b.slug === slug);
      if (!product) continue;

      const existingItem = subscription.items.find(
        (item) => item.productType === product.productType,
      );
      if (existingItem) {
        itemUpdates.push({ id: existingItem.stripeItemId, deleted: true });
      }
    }

    // Add bundles
    for (const slug of addBundles) {
      const product = productConfigs.find((b) => b.slug === slug);
      if (!product) continue;

      const priceId = product.annualPriceId ?? product.monthlyPriceId;
      if (!priceId) continue;

      const alreadyExists = subscription.items.some(
        (item) => item.productType === product.productType,
      );
      if (!alreadyExists) {
        itemUpdates.push({ price: priceId });
      }
    }

    if (itemUpdates.length === 0) {
      return NextResponse.json({ message: "No changes to apply" });
    }

    const updated = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { items: itemUpdates },
    );

    await syncSubscriptionFromStripe(updated);

    const refreshed = await prisma.subscription.findUnique({
      where: { agentId: id },
      include: { items: true },
    });

    return NextResponse.json({ subscription: refreshed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to modify subscription", detail: message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  const subscription = await prisma.subscription.findUnique({
    where: { agentId: id },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 },
    );
  }

  try {
    const canceled = await stripe.subscriptions.cancel(
      subscription.stripeSubscriptionId,
    );

    await syncSubscriptionFromStripe(canceled);

    return NextResponse.json({ message: "Subscription canceled" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to cancel subscription", detail: message },
      { status: 500 },
    );
  }
}
