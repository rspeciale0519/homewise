import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  getStripeSubscriptionPeriodBounds,
  syncSubscriptionFromStripe,
} from "@/lib/billing/stripe-sync";
import { cancelSubscriptionSchema } from "@/schemas/billing.schema";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

const SUBSCRIPTION_TRANSACTION_TIMEOUT_MS = 30_000;

async function lockAgentSubscription(
  tx: Prisma.TransactionClient,
  agentId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`billing-subscription:${agentId}`}, 0))
  `;
}

export async function POST(request: NextRequest) {
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

  const parsed = cancelSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cancellation request" }, { status: 400 });
  }

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockAgentSubscription(tx, agent.id);

        const lockedAgent = await tx.agent.findUnique({
          where: { id: agent.id },
          select: {
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
        if (currentSubscription.status === "canceled") {
          await syncSubscriptionFromStripe(currentSubscription, tx);
          return {
            kind: "error",
            error: "Subscription is already canceled",
            status: 409,
          } as const;
        }

        const alreadyScheduled = currentSubscription.cancel_at_period_end ||
          typeof currentSubscription.cancel_at === "number";
        const reconciledSubscription = alreadyScheduled
          ? currentSubscription
          : await stripe.subscriptions.update(stripeSubscriptionId, {
              cancel_at: "min_period_end",
              ...(parsed.data.reason
                ? { metadata: { cancel_reason: parsed.data.reason } }
                : {}),
            });

        await syncSubscriptionFromStripe(reconciledSubscription, tx);
        const cancelAt = reconciledSubscription.cancel_at ?? (
          reconciledSubscription.items.data.length > 0
            ? Math.floor(
                getStripeSubscriptionPeriodBounds(reconciledSubscription)
                  .periodEnd.getTime() / 1000,
              )
            : null
        );
        return { kind: "success", cancelAt } as const;
      },
      { timeout: SUBSCRIPTION_TRANSACTION_TIMEOUT_MS },
    );

    if (outcome.kind === "error") {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    return NextResponse.json({ success: true, cancelAt: outcome.cancelAt });
  } catch (err) {
    logApiError("billing/subscription/cancel", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
