import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
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
        await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
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

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!stripeCustomer) return;

  await prisma.subscription.updateMany({
    where: { agentId: stripeCustomer.agentId },
    data: { status: "canceled" },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { agentId: stripeCustomer.agentId },
  });
  if (subscription) {
    await prisma.subscriptionItem.deleteMany({
      where: { subscriptionId: subscription.id },
    });
  }
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subId = extractSubscriptionId(invoice);
  if (!subId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "active" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = extractSubscriptionId(invoice);
  if (!subId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "past_due" },
  });
}
