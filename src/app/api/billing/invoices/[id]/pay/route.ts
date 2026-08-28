import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findUnique({
    where: { userId: auth.user.id },
    include: { stripeCustomer: true, subscription: { include: { items: true } } },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const { id } = await params;

  try {
    const target = await stripe.invoices.retrieve(id);
    const invoiceCustomer =
      typeof target.customer === "string"
        ? target.customer
        : target.customer?.id;
    if (invoiceCustomer !== agent.stripeCustomer.stripeCustomerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const invoice = await stripe.invoices.pay(id);

    return NextResponse.json({ success: true, status: invoice.status });
  } catch (err) {
    logApiError("billing/invoices/pay", err);
    return NextResponse.json(
      { error: "Failed to pay invoice" },
      { status: 500 },
    );
  }
}
