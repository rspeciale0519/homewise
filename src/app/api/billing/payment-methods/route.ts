import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const attachPaymentMethodSchema = z
  .object({
    paymentMethodId: z.string().trim().min(1).max(255),
    setupIntentId: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

function getStripeResourceId(
  resource: string | { id: string } | null | undefined,
): string | null {
  if (typeof resource === "string") return resource;
  return resource?.id ?? null;
}

export async function GET() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findUnique({
    where: { userId: auth.user.id },
    include: { stripeCustomer: true },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const stripeCustomerId = agent.stripeCustomer.stripeCustomerId;

  try {
    const [methods, customer] = await Promise.all([
      stripe.customers.listPaymentMethods(stripeCustomerId, { limit: 10 }),
      stripe.customers.retrieve(stripeCustomerId),
    ]);

    if (customer.deleted) {
      return NextResponse.json(
        { error: "Stripe customer has been deleted" },
        { status: 404 },
      );
    }

    const defaultPaymentMethodId =
      customer.invoice_settings?.default_payment_method ?? null;

    return NextResponse.json({
      paymentMethods: methods.data,
      defaultPaymentMethodId:
        typeof defaultPaymentMethodId === "string"
          ? defaultPaymentMethodId
          : (defaultPaymentMethodId?.id ?? null),
    });
  } catch (err) {
    logApiError("billing/payment-methods/list", err);
    return NextResponse.json(
      { error: "Failed to list payment methods" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findUnique({
    where: { userId: auth.user.id },
    include: { stripeCustomer: true },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const stripeCustomerId = agent.stripeCustomer.stripeCustomerId;

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 1_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "Request is too large" },
        { status: 413 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = attachPaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment method request" },
      { status: 400 },
    );
  }

  const { paymentMethodId, setupIntentId } = parsed.data;

  try {
    const existingPaymentMethod =
      await stripe.paymentMethods.retrieve(paymentMethodId);
    const existingCustomerId = getStripeResourceId(
      existingPaymentMethod.customer,
    );

    if (existingCustomerId === stripeCustomerId) {
      return NextResponse.json(existingPaymentMethod);
    }

    if (existingCustomerId) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 },
      );
    }

    if (!setupIntentId) {
      return NextResponse.json(
        { error: "A completed setup intent is required" },
        { status: 400 },
      );
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const setupCustomerId = getStripeResourceId(setupIntent.customer);
    const setupPaymentMethodId = getStripeResourceId(
      setupIntent.payment_method,
    );

    if (
      setupIntent.status !== "succeeded" ||
      setupCustomerId !== stripeCustomerId ||
      setupPaymentMethodId !== paymentMethodId
    ) {
      return NextResponse.json(
        { error: "Payment method verification failed" },
        { status: 400 },
      );
    }

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    return NextResponse.json(paymentMethod);
  } catch (err) {
    logApiError("billing/payment-methods/attach", err);
    return NextResponse.json(
      { error: "Failed to attach payment method" },
      { status: 500 },
    );
  }
}
