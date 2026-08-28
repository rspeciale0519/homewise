import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { modifySubscriptionSchema } from "@/schemas/billing.schema";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { resolveAgentPlatform } from "@/lib/platform/filter";

const MODIFY_TRANSACTION_TIMEOUT_MS = 30_000;
const EDITABLE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

async function lockAgentSubscription(
  tx: Prisma.TransactionClient,
  agentId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`billing-subscription:${agentId}`}, 0))
  `;
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findUnique({
    where: { userId: auth.user.id },
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
    body = await readJsonBodyWithLimit(request, 10_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = modifySubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription changes" }, { status: 400 });
  }

  const bundleSlugsToAdd = parsed.data.addBundles;
  const bundleSlugsToRemove = parsed.data.removeBundles;
  const addOnSlugsToAdd = parsed.data.addOns;
  const addOnSlugsToRemove = parsed.data.removeAddOns;
  const operationId = parsed.data.operationId;

  if (addOnSlugsToAdd.length > 0) {
    return NextResponse.json(
      { error: "Add-ons are not available for purchase" },
      { status: 400 },
    );
  }

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockAgentSubscription(tx, agent.id);

        const lockedAgent = await tx.agent.findUnique({
          where: { id: agent.id },
          select: {
            id: true,
            platform: true,
            stripeCustomer: { select: { stripeCustomerId: true } },
            subscription: { select: { stripeSubscriptionId: true } },
          },
        });
        if (!lockedAgent?.stripeCustomer) {
          return { kind: "error", error: "No billing account", status: 404 } as const;
        }
        if (!lockedAgent.subscription) {
          return { kind: "error", error: "No active subscription", status: 404 } as const;
        }

        const stripeSubscriptionId = lockedAgent.subscription.stripeSubscriptionId;
        const currentStripeSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        const stripeCustomerId =
          typeof currentStripeSubscription.customer === "string"
            ? currentStripeSubscription.customer
            : currentStripeSubscription.customer.id;
        if (stripeCustomerId !== lockedAgent.stripeCustomer.stripeCustomerId) {
          return {
            kind: "error",
            error: "Billing account does not match the subscription",
            status: 409,
          } as const;
        }
        if (!EDITABLE_SUBSCRIPTION_STATUSES.has(currentStripeSubscription.status)) {
          return {
            kind: "error",
            error: "Subscription cannot be changed in its current state",
            status: 409,
          } as const;
        }
        if (
          currentStripeSubscription.cancel_at_period_end ||
          typeof currentStripeSubscription.cancel_at === "number"
        ) {
          return {
            kind: "error",
            error: "Subscription is already scheduled for cancellation",
            status: 409,
          } as const;
        }

        const platform = resolveAgentPlatform(lockedAgent);
        const existingItems = currentStripeSubscription.items.data.map((item) => ({
          stripeItemId: item.id,
          stripePriceId: typeof item.price === "string" ? item.price : item.price.id,
        }));
        const existingPriceIds = existingItems.map((item) => item.stripePriceId);
        const requestedSlugs = [
          ...new Set([
            ...bundleSlugsToAdd,
            ...bundleSlugsToRemove,
            ...addOnSlugsToRemove,
          ]),
        ];
        const productConfigs = await tx.productConfig.findMany({
          where: {
            OR: [
              { platforms: { has: platform } },
              { slug: { in: requestedSlugs } },
              { monthlyPriceId: { in: existingPriceIds } },
              { annualPriceId: { in: existingPriceIds } },
            ],
          },
        });

        const productBySlug = new Map(
          productConfigs.map((product) => [product.slug, product]),
        );
        const hasExistingPrice = (product: (typeof productConfigs)[number]) =>
          existingPriceIds.some(
            (priceId) =>
              product.monthlyPriceId === priceId || product.annualPriceId === priceId,
          );
        const hasExpectedType = (
          product: (typeof productConfigs)[number],
          isAddOn: boolean,
        ) => (product.productType === "add_on") === isAddOn;

        const hasUnavailableAddition = bundleSlugsToAdd.some((slug) => {
          const product = productBySlug.get(slug);
          return !product ||
            !product.isActive ||
            !product.platforms.includes(platform) ||
            !hasExpectedType(product, false);
        });
        const hasUnavailableBundleRemoval = bundleSlugsToRemove.some((slug) => {
          const product = productBySlug.get(slug);
          return !product || !hasExpectedType(product, false) || !hasExistingPrice(product);
        });
        const hasUnavailableAddOnRemoval = addOnSlugsToRemove.some((slug) => {
          const product = productBySlug.get(slug);
          return !product || !hasExpectedType(product, true) || !hasExistingPrice(product);
        });
        if (
          hasUnavailableAddition ||
          hasUnavailableBundleRemoval ||
          hasUnavailableAddOnRemoval
        ) {
          return {
            kind: "error",
            error: "One or more products are unavailable",
            status: 400,
          } as const;
        }

        const slugsToRemove = [...bundleSlugsToRemove, ...addOnSlugsToRemove];
        const productsToAdd = bundleSlugsToAdd.map((slug) => ({
          slug,
          isAddOn: false,
        }));
        const plannedPriceIds = new Set(existingPriceIds);
        const itemUpdates: {
          id?: string;
          price?: string;
          deleted?: boolean;
        }[] = [];
        let hasChanges = false;

        for (const item of existingItems) {
          const isBeingRemoved = slugsToRemove.some((slug) => {
            const product = productBySlug.get(slug);
            return product?.monthlyPriceId === item.stripePriceId ||
              product?.annualPriceId === item.stripePriceId;
          });

          if (isBeingRemoved) {
            itemUpdates.push({ id: item.stripeItemId, deleted: true });
            plannedPriceIds.delete(item.stripePriceId);
            hasChanges = true;
          } else {
            itemUpdates.push({ id: item.stripeItemId });
          }
        }

        const usesAnnual = existingPriceIds.some((priceId) =>
          productConfigs.some((product) => product.annualPriceId === priceId),
        );

        for (const { slug, isAddOn } of productsToAdd) {
          const product = productBySlug.get(slug);
          if (!product) {
            return {
              kind: "error",
              error: `Product not found: ${slug}`,
              status: 400,
            } as const;
          }

          const priceId = isAddOn
            ? product.monthlyPriceId
            : usesAnnual
              ? (product.annualPriceId ?? product.monthlyPriceId)
              : (product.monthlyPriceId ?? product.annualPriceId);
          if (!priceId) {
            return {
              kind: "error",
              error: `No price configured for product: ${slug}`,
              status: 400,
            } as const;
          }

          if (!plannedPriceIds.has(priceId)) {
            itemUpdates.push({ price: priceId });
            plannedPriceIds.add(priceId);
            hasChanges = true;
          }
        }

        const keepsPlan = productConfigs.some(
          (product) =>
            product.productType !== "add_on" &&
            ((product.monthlyPriceId !== null &&
              plannedPriceIds.has(product.monthlyPriceId)) ||
              (product.annualPriceId !== null &&
                plannedPriceIds.has(product.annualPriceId))),
        );
        if (bundleSlugsToRemove.length > 0 && !keepsPlan) {
          return {
            kind: "error",
            error:
              "A subscription must keep at least one plan. Cancel the subscription instead.",
            status: 400,
          } as const;
        }

        let reconciledSubscription = currentStripeSubscription;
        if (hasChanges) {
          await stripe.subscriptions.update(
              stripeSubscriptionId,
              {
                items: itemUpdates,
                proration_behavior: "always_invoice",
              },
              {
                idempotencyKey:
                  `billing-subscription-modify:${agent.id}:${operationId}`,
              },
            );

          const liveSubscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId,
          );
          const liveCustomerId =
            typeof liveSubscription.customer === "string"
              ? liveSubscription.customer
              : liveSubscription.customer.id;
          if (liveCustomerId !== lockedAgent.stripeCustomer.stripeCustomerId) {
            return {
              kind: "error",
              error: "Billing account does not match the subscription",
              status: 409,
            } as const;
          }

          const livePriceIds = liveSubscription.items.data.map((item) =>
            typeof item.price === "string" ? item.price : item.price.id
          );
          const livePriceSet = new Set(livePriceIds);
          const requestIsCurrent =
            livePriceIds.length === plannedPriceIds.size &&
            livePriceSet.size === plannedPriceIds.size &&
            [...plannedPriceIds].every((priceId) => livePriceSet.has(priceId));
          if (!requestIsCurrent) {
            return {
              kind: "error",
              error: "The subscription change was superseded. Refresh and try again.",
              status: 409,
            } as const;
          }
          reconciledSubscription = liveSubscription;
        }

        await syncSubscriptionFromStripe(reconciledSubscription, tx);
        return { kind: "success" } as const;
      },
      { timeout: MODIFY_TRANSACTION_TIMEOUT_MS },
    );

    if (outcome.kind === "error") {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logApiError("billing/subscription/modify", err);
    return NextResponse.json(
      { error: "Failed to modify subscription" },
      { status: 500 },
    );
  }
}
