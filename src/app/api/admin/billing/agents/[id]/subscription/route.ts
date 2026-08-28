import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { adminModifySubscriptionSchema } from "@/schemas/billing.schema";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { resolveAgentPlatform } from "@/lib/platform/filter";

const SUBSCRIPTION_TRANSACTION_TIMEOUT_MS = 30_000;

async function lockAgentSubscription(
  tx: Prisma.TransactionClient,
  agentId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`billing-subscription:${agentId}`}, 0))
  `;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 10_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
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

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockAgentSubscription(tx, id);

        const agent = await tx.agent.findUnique({
          where: { id },
          select: {
            platform: true,
            stripeCustomer: { select: { stripeCustomerId: true } },
            subscription: { select: { stripeSubscriptionId: true } },
          },
        });
        if (!agent) {
          return { kind: "error", error: "Agent not found", status: 404 } as const;
        }
        if (!agent.stripeCustomer) {
          return { kind: "error", error: "No billing account", status: 404 } as const;
        }
        if (!agent.subscription) {
          return {
            kind: "error",
            error: "No active subscription found",
            status: 404,
          } as const;
        }

        const stripeSubscriptionId = agent.subscription.stripeSubscriptionId;
        const currentStripeSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        const stripeCustomerId =
          typeof currentStripeSubscription.customer === "string"
            ? currentStripeSubscription.customer
            : currentStripeSubscription.customer.id;
        if (stripeCustomerId !== agent.stripeCustomer.stripeCustomerId) {
          return {
            kind: "error",
            error: "Billing account does not match the subscription",
            status: 409,
          } as const;
        }

        const currentItems = currentStripeSubscription.items.data.map((item) => ({
          stripeItemId: item.id,
          stripePriceId: typeof item.price === "string" ? item.price : item.price.id,
        }));
        const currentPriceIds = currentItems.map((item) => item.stripePriceId);
        const requestedSlugs = [...new Set([...addBundles, ...removeBundles])];
        const productConfigs = await tx.productConfig.findMany({
          where: {
            OR: [
              { slug: { in: requestedSlugs } },
              { monthlyPriceId: { in: currentPriceIds } },
              { annualPriceId: { in: currentPriceIds } },
            ],
          },
        });
        const productBySlug = new Map(
          productConfigs.map((product) => [product.slug, product]),
        );

        const platform = resolveAgentPlatform(agent);
        const hasUnavailableAddition = addBundles.some((slug) => {
          const product = productBySlug.get(slug);
          return !product ||
            !product.isActive ||
            !product.platforms.includes(platform) ||
            product.productType === "add_on" ||
            (!product.annualPriceId && !product.monthlyPriceId);
        });
        const hasInvalidRemoval = removeBundles.some((slug) => {
          const product = productBySlug.get(slug);
          return !product || product.productType === "add_on";
        });
        if (hasUnavailableAddition || hasInvalidRemoval) {
          return {
            kind: "error",
            error: "One or more bundles are unavailable",
            status: 400,
          } as const;
        }

        const removalPriceIds = new Set(
          removeBundles.flatMap((slug) => {
            const product = productBySlug.get(slug);
            return product
              ? [product.monthlyPriceId, product.annualPriceId].filter(
                  (priceId): priceId is string => Boolean(priceId),
                )
              : [];
          }),
        );
        const itemUpdates: { id?: string; price?: string; deleted?: boolean }[] = [];

        for (const item of currentItems) {
          if (removalPriceIds.has(item.stripePriceId)) {
            itemUpdates.push({ id: item.stripeItemId, deleted: true });
          }
        }

        const priceToProductType = new Map(
          productConfigs.flatMap((product) => {
            const entries: [string, string][] = [];
            if (product.monthlyPriceId) {
              entries.push([product.monthlyPriceId, product.productType]);
            }
            if (product.annualPriceId) {
              entries.push([product.annualPriceId, product.productType]);
            }
            return entries;
          }),
        );
        const plannedProductTypes = new Set(
          currentItems
            .filter((item) => !removalPriceIds.has(item.stripePriceId))
            .map((item) => priceToProductType.get(item.stripePriceId))
            .filter(
              (productType): productType is string =>
                Boolean(productType) && productType !== "add_on",
            ),
        );

        for (const slug of addBundles) {
          const product = productBySlug.get(slug);
          if (!product) continue;

          const priceId = product.annualPriceId ?? product.monthlyPriceId;
          if (priceId && !plannedProductTypes.has(product.productType)) {
            itemUpdates.push({ price: priceId });
            plannedProductTypes.add(product.productType);
          }
        }

        if (removeBundles.length > 0 && plannedProductTypes.size === 0) {
          return {
            kind: "error",
            error:
              "A subscription must keep at least one plan. Cancel the subscription instead.",
            status: 400,
          } as const;
        }

        const reconciledSubscription = itemUpdates.length > 0
          ? await stripe.subscriptions.update(stripeSubscriptionId, {
              items: itemUpdates,
            })
          : currentStripeSubscription;

        await syncSubscriptionFromStripe(reconciledSubscription, tx);
        return { kind: "success" } as const;
      },
      { timeout: SUBSCRIPTION_TRANSACTION_TIMEOUT_MS },
    );

    if (outcome.kind === "error") {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    const refreshed = await prisma.subscription.findUnique({
      where: { agentId: id },
      include: { items: true },
    });

    return NextResponse.json({ subscription: refreshed });
  } catch (err) {
    logApiError("admin/billing/subscription/modify", err);
    return NextResponse.json(
      { error: "Failed to modify subscription" },
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

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockAgentSubscription(tx, id);

        const agent = await tx.agent.findUnique({
          where: { id },
          select: {
            stripeCustomer: { select: { stripeCustomerId: true } },
            subscription: { select: { stripeSubscriptionId: true } },
          },
        });
        if (!agent) {
          return { kind: "error", error: "Agent not found", status: 404 } as const;
        }
        if (!agent.stripeCustomer) {
          return { kind: "error", error: "No billing account", status: 404 } as const;
        }
        if (!agent.subscription) {
          return {
            kind: "error",
            error: "No active subscription found",
            status: 404,
          } as const;
        }

        const stripeSubscriptionId = agent.subscription.stripeSubscriptionId;
        const currentStripeSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        const stripeCustomerId =
          typeof currentStripeSubscription.customer === "string"
            ? currentStripeSubscription.customer
            : currentStripeSubscription.customer.id;
        if (stripeCustomerId !== agent.stripeCustomer.stripeCustomerId) {
          return {
            kind: "error",
            error: "Billing account does not match the subscription",
            status: 409,
          } as const;
        }

        const reconciledSubscription = currentStripeSubscription.status === "canceled"
          ? currentStripeSubscription
          : await stripe.subscriptions.cancel(stripeSubscriptionId);

        await syncSubscriptionFromStripe(reconciledSubscription, tx);
        return { kind: "success" } as const;
      },
      { timeout: SUBSCRIPTION_TRANSACTION_TIMEOUT_MS },
    );

    if (outcome.kind === "error") {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    return NextResponse.json({ message: "Subscription canceled" });
  } catch (err) {
    logApiError("admin/billing/subscription/cancel", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
