import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findUnique({
    where: { userId: auth.user.id },
    include: { stripeCustomer: true },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const { id } = await params;
  const stripeCustomerId = agent.stripeCustomer.stripeCustomerId;

  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    const paymentMethodCustomer =
      typeof paymentMethod.customer === "string"
        ? paymentMethod.customer
        : paymentMethod.customer?.id;

    if (paymentMethodCustomer !== stripeCustomerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await Promise.all([
      stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: id },
      }),
      prisma.stripeCustomer.update({
        where: { agentId: agent.id },
        data: { defaultPaymentMethod: id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    logApiError("billing/payment-methods/default", err);
    return NextResponse.json(
      { error: "Failed to set default payment method" },
      { status: 500 },
    );
  }
}
