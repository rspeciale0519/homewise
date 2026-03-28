import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/billing/stripe-sync";
import {
  adminProcessCardPaymentSchema,
  adminRecordOfflinePaymentSchema,
} from "@/schemas/billing.schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Flow A: Card/ACH payment (has paymentMethodId)
  if (raw.paymentMethodId) {
    const parsed = adminProcessCardPaymentSchema.safeParse({
      ...raw,
      agentId: id,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { amount, paymentMethodId, description } = parsed.data;

    try {
      const customerId = await getOrCreateStripeCustomer(id);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        description: description ?? `Admin payment for agent ${id}`,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
      });

      const record = await prisma.paymentRecord.create({
        data: {
          agentId: id,
          stripePaymentIntentId: paymentIntent.id,
          amount,
          currency: "usd",
          paymentType: "card",
          status: paymentIntent.status,
          processedBy: auth.user.id,
          notes: description ?? null,
        },
      });

      return NextResponse.json({ paymentRecord: record }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: "Payment failed", detail: message },
        { status: 500 },
      );
    }
  }

  // Flow B: Offline payment (cash/check)
  const parsed = adminRecordOfflinePaymentSchema.safeParse({
    ...raw,
    agentId: id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { amount, paymentType, notes } = parsed.data;

  try {
    const record = await prisma.paymentRecord.create({
      data: {
        agentId: id,
        amount,
        currency: "usd",
        paymentType,
        status: "succeeded",
        processedBy: auth.user.id,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ paymentRecord: record }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
