import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: { email: auth.profile.email ?? undefined },
    include: { stripeCustomer: true },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const { id } = await params;
  const stripeCustomerId = agent.stripeCustomer.stripeCustomerId;

  try {
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to set default payment method", detail: message },
      { status: 500 },
    );
  }
}
