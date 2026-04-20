import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/billing/stripe-sync";
import { checkoutSessionSchema } from "@/schemas/billing.schema";

function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && envUrl.startsWith("https://")) return envUrl;
  return "https://app.homewisefl.com";
}

function resolveTrustedReturnUrl(
  target: string | undefined,
  fallbackPath: string,
  siteUrl: string,
): string | null {
  const site = new URL(siteUrl);

  if (!target) {
    return new URL(fallbackPath, site).toString();
  }

  try {
    const resolved = target.startsWith("/")
      ? new URL(target, site)
      : new URL(target);

    if (resolved.origin !== site.origin) {
      return null;
    }

    return new URL(
      `${resolved.pathname}${resolved.search}${resolved.hash}`,
      site,
    ).toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const siteUrl = getSiteUrl();
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

  const { bundles, addOns, billingInterval, successUrl, cancelUrl } = parsed.data;

  const resolvedSuccessUrl = resolveTrustedReturnUrl(
    successUrl,
    "/dashboard/billing?checkout=success",
    siteUrl,
  );
  const resolvedCancelUrl = resolveTrustedReturnUrl(
    cancelUrl,
    "/dashboard/billing?checkout=cancel",
    siteUrl,
  );

  if (!resolvedSuccessUrl || !resolvedCancelUrl) {
    return NextResponse.json(
      { error: "Return URLs must stay on the Homewise site." },
      { status: 400 },
    );
  }

  const customerId = await getOrCreateStripeCustomer(agent.id);

  const bundleConfigs = await prisma.productConfig.findMany({
    where: { isActive: true },
  });

  type LineItem = { price: string; quantity: number };
  const lineItems: LineItem[] = [];

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

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No items selected. Pick at least one bundle or feature." },
      { status: 400 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["card", "us_bank_account"],
      subscription_data: {
        metadata: { agentId: agent.id },
      },
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] Stripe error:", message);
    return NextResponse.json(
      { error: "Failed to create checkout session", detail: message },
      { status: 500 },
    );
  }
}
