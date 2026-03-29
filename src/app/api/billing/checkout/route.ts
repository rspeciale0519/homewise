import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/billing/stripe-sync";
import { checkoutSessionSchema } from "@/schemas/billing.schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const { user } = auth;

  const agent = await prisma.agent.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email ?? "" }],
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { bundles, addOns, billingInterval, successUrl, cancelUrl } =
    parsed.data;

  const customerId = await getOrCreateStripeCustomer(agent.id);

  const bundleConfigs = await prisma.bundleConfig.findMany({
    where: { isActive: true },
  });

  const membershipBundle = bundleConfigs.find(
    (b) => b.productType === "membership",
  );

  if (!membershipBundle?.annualPriceId) {
    return NextResponse.json(
      { error: "Membership bundle is not configured" },
      { status: 500 },
    );
  }

  type LineItem = { price: string; quantity: number };
  const lineItems: LineItem[] = [
    { price: membershipBundle.annualPriceId, quantity: 1 },
  ];

  for (const slug of bundles) {
    const bundle = bundleConfigs.find((b) => b.slug === slug);
    if (!bundle) continue;

    const priceId =
      billingInterval === "annual"
        ? (bundle.annualPriceId ?? bundle.monthlyPriceId)
        : bundle.monthlyPriceId;

    if (priceId) {
      lineItems.push({ price: priceId, quantity: 1 });
    }
  }

  for (const slug of addOns) {
    const addOn = bundleConfigs.find((b) => b.slug === slug);
    if (!addOn?.monthlyPriceId) continue;
    lineItems.push({ price: addOn.monthlyPriceId, quantity: 1 });
  }

  try {
    console.log("[checkout] Creating session for customer:", customerId, "items:", lineItems.length);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["card", "us_bank_account"],
      subscription_data: {
        metadata: { agentId: agent.id },
      },
      success_url:
        successUrl ?? `${SITE_URL}/dashboard/billing?checkout=success`,
      cancel_url: cancelUrl ?? `${SITE_URL}/dashboard/billing?checkout=cancel`,
    });

    console.log("[checkout] Session created:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stripeCode = (err as Record<string, unknown>)?.code ?? "unknown";
    const stripeType = (err as Record<string, unknown>)?.type ?? "unknown";
    console.error("[checkout] Stripe error:", { message, code: stripeCode, type: stripeType });
    return NextResponse.json(
      { error: "Failed to create checkout session", detail: message, code: stripeCode },
      { status: 500 },
    );
  }
}
