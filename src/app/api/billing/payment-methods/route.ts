import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: { email: auth.profile.email ?? undefined },
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list payment methods", detail: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: { email: auth.profile.email ?? undefined },
    include: { stripeCustomer: true },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const stripeCustomerId = agent.stripeCustomer.stripeCustomerId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).paymentMethodId !== "string"
  ) {
    return NextResponse.json(
      { error: "paymentMethodId is required" },
      { status: 400 },
    );
  }

  const { paymentMethodId } = body as { paymentMethodId: string };

  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    return NextResponse.json(paymentMethod);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to attach payment method", detail: message },
      { status: 500 },
    );
  }
}
