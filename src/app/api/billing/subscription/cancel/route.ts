import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
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

  let body: { reason?: string } = {};
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed === "object" && parsed !== null) {
      body = parsed as { reason?: string };
    }
  } catch {
    // Body is optional; proceed with empty body
  }

  const stripeSubscriptionId = agent.subscription.stripeSubscriptionId;

  try {
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
      ...(body.reason ? { metadata: { cancel_reason: body.reason } } : {}),
    });

    await prisma.subscription.update({
      where: { agentId: agent.id },
      data: { cancelAtPeriodEnd: true },
    });

    // Derive period end from first subscription item (Stripe API 2024-11-20+)
    const firstItem = subscription.items.data[0];
    const cancelAt = firstItem
      ? firstItem.current_period_end
      : subscription.cancel_at;

    return NextResponse.json({ success: true, cancelAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to cancel subscription", detail: message },
      { status: 500 },
    );
  }
}
