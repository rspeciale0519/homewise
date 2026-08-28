import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/billing/stripe-sync";
import { resolveTrustedReturnUrl } from "@/lib/billing/return-url";
import { checkoutSessionSchema } from "@/schemas/billing.schema";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { resolveAgentPlatform } from "@/lib/platform/filter";

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);
const CHECKOUT_TRANSACTION_TIMEOUT_MS = 30_000;

function hasBlockingSubscriptionStatus(status: string): boolean {
  return !TERMINAL_SUBSCRIPTION_STATUSES.has(status);
}

async function findOpenSubscriptionCheckout(
  customerId: string,
  agentId: string,
  operationId: string,
): Promise<{ matchingUrl: string | null; hasOther: boolean }> {
  let startingAfter: string | undefined;
  let hasOther = false;

  for (;;) {
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const session of sessions.data) {
      if (session.mode !== "subscription") continue;
      if (
        session.metadata?.agentId === agentId &&
        session.metadata.operationId === operationId &&
        session.url
      ) {
        return { matchingUrl: session.url, hasOther };
      }
      hasOther = true;
    }
    if (!sessions.has_more) return { matchingUrl: null, hasOther };

    const lastSession = sessions.data.at(-1);
    if (!lastSession) return { matchingUrl: null, hasOther: true };
    startingAfter = lastSession.id;
  }
}

async function hasBlockingStripeSubscription(customerId: string): Promise<boolean> {
  let startingAfter: string | undefined;

  for (;;) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    if (subscriptions.data.some(({ status }) => hasBlockingSubscriptionStatus(status))) {
      return true;
    }
    if (!subscriptions.has_more) return false;

    const lastSubscription = subscriptions.data.at(-1);
    if (!lastSubscription) return true;
    startingAfter = lastSubscription.id;
  }
}

async function lockAgentCheckout(
  tx: Prisma.TransactionClient,
  agentId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`billing-checkout:${agentId}`}, 0))
  `;
}

function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && envUrl.startsWith("https://")) return envUrl;
  return "https://app.homewisefl.com";
}

export async function POST(request: NextRequest) {
  const siteUrl = getSiteUrl();
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const { user } = auth;

  const agent = await prisma.agent.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      platform: true,
      subscription: { select: { status: true } },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (
    agent.subscription &&
    hasBlockingSubscriptionStatus(agent.subscription.status)
  ) {
    return NextResponse.json(
      { error: "A subscription already exists. Manage it from your billing dashboard." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 10_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { operationId, bundles, addOns, billingInterval, successUrl, cancelUrl } = parsed.data;

  if (addOns.length > 0) {
    return NextResponse.json(
      { error: "Add-ons are not available for checkout yet." },
      { status: 400 },
    );
  }

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

  const platform = resolveAgentPlatform(agent);
  const selectedSlugs = [...bundles, ...addOns];
  const productConfigs = await prisma.productConfig.findMany({
    where: {
      isActive: true,
      platforms: { has: platform },
      slug: { in: selectedSlugs },
    },
  });

  const productBySlug = new Map(productConfigs.map((product) => [product.slug, product]));
  if (productBySlug.size !== selectedSlugs.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  }

  type LineItem = { price: string; quantity: number };
  const lineItems: LineItem[] = [];
  const selectedPriceIds = new Set<string>();

  for (const slug of bundles) {
    const product = productBySlug.get(slug);
    if (!product || product.productType === "add_on") {
      return NextResponse.json({ error: `Invalid bundle: ${slug}` }, { status: 400 });
    }

    const priceId = billingInterval === "annual"
      ? product.annualPriceId
      : product.monthlyPriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: `The ${slug} product does not support ${billingInterval} billing.` },
        { status: 400 },
      );
    }

    if (!selectedPriceIds.has(priceId)) {
      lineItems.push({ price: priceId, quantity: 1 });
      selectedPriceIds.add(priceId);
    }
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No items selected. Pick at least one bundle or feature." },
      { status: 400 },
    );
  }

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockAgentCheckout(tx, agent.id);

        const localSubscription = await tx.subscription.findUnique({
          where: { agentId: agent.id },
          select: { status: true },
        });
        if (
          localSubscription &&
          hasBlockingSubscriptionStatus(localSubscription.status)
        ) {
          return { kind: "subscription-exists" } as const;
        }

        const customerId = await getOrCreateStripeCustomer(agent.id);

        // Check open sessions first. A session that completes during this check is
        // visible to the following subscription query before a new session is made.
        const openCheckout = await findOpenSubscriptionCheckout(
          customerId,
          agent.id,
          operationId,
        );
        if (openCheckout.matchingUrl) {
          return { kind: "created", url: openCheckout.matchingUrl } as const;
        }
        if (openCheckout.hasOther) {
          return { kind: "checkout-open" } as const;
        }
        if (await hasBlockingStripeSubscription(customerId)) {
          return { kind: "subscription-exists" } as const;
        }

        const session = await stripe.checkout.sessions.create(
          {
            customer: customerId,
            mode: "subscription",
            line_items: lineItems,
            payment_method_types: ["card", "us_bank_account"],
            metadata: { agentId: agent.id, operationId },
            subscription_data: {
              metadata: { agentId: agent.id },
            },
            success_url: resolvedSuccessUrl,
            cancel_url: resolvedCancelUrl,
          },
          { idempotencyKey: `billing-checkout:${agent.id}:${operationId}` },
        );

        return { kind: "created", url: session.url } as const;
      },
      { timeout: CHECKOUT_TRANSACTION_TIMEOUT_MS },
    );

    if (outcome.kind === "subscription-exists") {
      return NextResponse.json(
        { error: "A subscription already exists. Manage it from your billing dashboard." },
        { status: 409 },
      );
    }
    if (outcome.kind === "checkout-open") {
      return NextResponse.json(
        { error: "A subscription checkout is already in progress." },
        { status: 409 },
      );
    }

    return NextResponse.json({ url: outcome.url });
  } catch (err) {
    logApiError("billing/checkout", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
