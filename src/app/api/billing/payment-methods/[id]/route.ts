import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function DELETE(
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

  try {
    const pm = await stripe.paymentMethods.retrieve(id);
    const pmCustomer =
      typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
    if (pmCustomer !== agent.stripeCustomer.stripeCustomerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await stripe.paymentMethods.detach(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logApiError("billing/payment-methods/detach", err);
    return NextResponse.json(
      { error: "Failed to detach payment method" },
      { status: 500 },
    );
  }
}
