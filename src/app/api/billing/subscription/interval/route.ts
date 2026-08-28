import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { changeSubscriptionIntervalSchema } from "@/schemas/billing.schema";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { resolveAgentPlatform } from "@/lib/platform/filter";

const SUBSCRIPTION_TRANSACTION_TIMEOUT_MS = 30_000;
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
    body = await readJsonBodyWithLimit(request, 1_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = changeSubscriptionIntervalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'interval must be "monthly" or "annual"' },
      { status: 400 },
    );
  }

  const { interval, operationId } = parsed.data;

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockAgentSubscription(tx, agent.id);

        const lockedAgent = await tx.agent.findUnique({
          where: { id: agent.id },
          select: {
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
        const currentSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        const customerId = typeof currentSubscription.customer === "string"
          ? currentSubscription.customer
          : currentSubscription.customer.id;
        if (customerId !== lockedAgent.stripeCustomer.stripeCustomerId) {
          return {
            kind: "error",
            error: "Billing account does not match the subscription",
            status: 409,
          } as const;
        }
        if (!EDITABLE_SUBSCRIPTION_STATUSES.has(currentSubscription.status)) {
          return {
            kind: "error",
            error: "Subscription cannot change billing interval in its current state",
            status: 409,
          } as const;
        }
        if (
          currentSubscription.cancel_at_period_end ||
          typeof currentSubscription.cancel_at === "number"
        ) {
          return {
            kind: "error",
            error: "Subscription is already scheduled for cancellation",
            status: 409,
          } as const;
        }

        const existingItems = currentSubscription.items.data.map((item) => ({
          stripeItemId: item.id,
          stripePriceId: typeof item.price === "string" ? item.price : item.price.id,
        }));
        const currentPriceIds = existingItems.map((item) => item.stripePriceId);
        const agentPlatform = resolveAgentPlatform(lockedAgent);

        // Load every matching config so invalid subscription state fails closed.
        const productConfigs = await tx.productConfig.findMany({
          where: {
            OR: [
              { monthlyPriceId: { in: currentPriceIds } },
              { annualPriceId: { in: currentPriceIds } },
            ],
          },
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
        const expectedPriceByItemId = new Map<string, string>();

        for (const item of existingItems) {
          const product = priceToProduct.get(item.stripePriceId);
          if (!product) {
            return {
              kind: "error",
              error: "Subscription contains an unknown product price",
              status: 409,
            } as const;
          }
          if (!product.isActive) {
            return {
              kind: "error",
              error: `Subscription contains an inactive product: ${product.slug}`,
              status: 409,
            } as const;
          }
          if (!product.platforms.includes(agentPlatform)) {
            return {
              kind: "error",
              error: `Subscription product is not available on this platform: ${product.slug}`,
              status: 409,
            } as const;
          }

          const targetPriceId = interval === "annual"
            ? (product.annualPriceId ?? product.monthlyPriceId)
            : (product.monthlyPriceId ?? product.annualPriceId);
          if (!targetPriceId) {
            return {
              kind: "error",
              error: `No ${interval} price configured for bundle: ${product.slug}`,
              status: 400,
            } as const;
          }
          expectedPriceByItemId.set(item.stripeItemId, targetPriceId);
          if (targetPriceId !== item.stripePriceId) {
            itemUpdates.push({ id: item.stripeItemId, price: targetPriceId });
          }
        }

        let reconciledSubscription = currentSubscription;
        if (itemUpdates.length > 0) {
          await stripe.subscriptions.update(
              stripeSubscriptionId,
              {
                items: itemUpdates,
                proration_behavior: "always_invoice",
              },
              {
                idempotencyKey:
                  `billing-subscription-interval:${agent.id}:${operationId}`,
              },
            );

          const liveSubscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId,
          );
          const liveCustomerId = typeof liveSubscription.customer === "string"
            ? liveSubscription.customer
            : liveSubscription.customer.id;
          if (liveCustomerId !== lockedAgent.stripeCustomer.stripeCustomerId) {
            return {
              kind: "error",
              error: "Billing account does not match the subscription",
              status: 409,
            } as const;
          }

          const livePriceByItemId = new Map(
            liveSubscription.items.data.map((item) => [
              item.id,
              typeof item.price === "string" ? item.price : item.price.id,
            ]),
          );
          const requestIsCurrent =
            livePriceByItemId.size === expectedPriceByItemId.size &&
            [...expectedPriceByItemId].every(
              ([itemId, priceId]) => livePriceByItemId.get(itemId) === priceId,
            );
          if (!requestIsCurrent) {
            return {
              kind: "error",
              error: "The billing interval request was superseded. Refresh and try again.",
              status: 409,
            } as const;
          }
          reconciledSubscription = liveSubscription;
        }

        await syncSubscriptionFromStripe(reconciledSubscription, tx);
        return {
          kind: "success",
          alreadyCurrent: itemUpdates.length === 0,
        } as const;
      },
      { timeout: SUBSCRIPTION_TRANSACTION_TIMEOUT_MS },
    );

    if (outcome.kind === "error") {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    return NextResponse.json({
      success: true,
      ...(outcome.alreadyCurrent
        ? { message: "Subscription already on the requested interval" }
        : {}),
    });
  } catch (err) {
    logApiError("billing/subscription/interval", err);
    return NextResponse.json(
      { error: "Failed to update billing interval" },
      { status: 500 },
    );
  }
}
