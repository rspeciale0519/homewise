import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { prisma } from "@/lib/prisma";
import {
  InvalidTextBodyError,
  readTextBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import type Stripe from "stripe";

const MAX_STRIPE_WEBHOOK_BYTES = 1_000_000;
const SUBSCRIPTION_TRANSACTION_TIMEOUT_MS = 30_000;
const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
]);

async function lockAgentSubscription(
  tx: Prisma.TransactionClient,
  agentId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${`billing-subscription:${agentId}`}, 0))
  `;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let body: string;
  try {
    body = await readTextBodyWithLimit(request, MAX_STRIPE_WEBHOOK_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    if (error instanceof InvalidTextBodyError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    throw error;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await reconcileSubscription(event.data.object as Stripe.Subscription, true);
        break;

      case "customer.subscription.deleted":
        await reconcileSubscription(event.data.object as Stripe.Subscription, false);
        break;

      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await reconcileInvoiceSubscription(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.trial_will_end":
        console.log(`Trial ending for subscription ${(event.data.object as Stripe.Subscription).id}`);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function reconcileSubscription(
  snapshot: {
    id: string;
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  },
  allowCreateOrReplacement: boolean,
) {
  const expectedCustomerId = getCustomerId(snapshot.customer);

  await prisma.$transaction(
    async (tx) => {
      const matchingSubscription = await tx.subscription.findUnique({
        where: { stripeSubscriptionId: snapshot.id },
        select: { agentId: true },
      });
      const stripeCustomer = matchingSubscription || !expectedCustomerId
        ? null
        : await tx.stripeCustomer.findUnique({
            where: { stripeCustomerId: expectedCustomerId },
            select: { agentId: true },
          });
      const agentId = matchingSubscription?.agentId ?? stripeCustomer?.agentId;
      if (!agentId) return;

      await lockAgentSubscription(tx, agentId);
      const lockedAgent = await tx.agent.findUnique({
        where: { id: agentId },
        select: {
          stripeCustomer: { select: { stripeCustomerId: true } },
          subscription: {
            select: { status: true, stripeSubscriptionId: true },
          },
        },
      });
      if (!lockedAgent) return;
      if (!lockedAgent.stripeCustomer) {
        throw new Error("Locked agent has no Stripe customer");
      }

      const localSubscription = lockedAgent.subscription;
      if (!allowCreateOrReplacement &&
        localSubscription?.stripeSubscriptionId !== snapshot.id) {
        return;
      }

      const current = await stripe.subscriptions.retrieve(snapshot.id);
      const currentCustomerId = getCustomerId(current.customer);
      if (expectedCustomerId && currentCustomerId !== expectedCustomerId) {
        throw new Error("Stripe subscription customer changed during reconciliation");
      }
      if (currentCustomerId !== lockedAgent.stripeCustomer.stripeCustomerId) {
        throw new Error("Stripe subscription customer does not match the locked agent");
      }

      if (localSubscription?.stripeSubscriptionId !== snapshot.id) {
        if (TERMINAL_SUBSCRIPTION_STATUSES.has(current.status)) return;
        if (localSubscription &&
          !TERMINAL_SUBSCRIPTION_STATUSES.has(localSubscription.status)) {
          return;
        }
      }

      await syncSubscriptionFromStripe(current, tx);
    },
    { timeout: SUBSCRIPTION_TRANSACTION_TIMEOUT_MS },
  );
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function reconcileInvoiceSubscription(invoice: Stripe.Invoice) {
  const subId = extractSubscriptionId(invoice);
  if (!subId) return;
  await reconcileSubscription(
    {
      id: subId,
      customer: invoice.customer,
    },
    true,
  );
}
