import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: { email: auth.profile.email ?? undefined },
    include: { stripeCustomer: true, subscription: { include: { items: true } } },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const { id } = await params;

  try {
    const invoice = await stripe.invoices.pay(id);

    return NextResponse.json({ success: true, status: invoice.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to pay invoice", detail: message },
      { status: 500 },
    );
  }
}
