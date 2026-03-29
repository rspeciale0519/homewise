import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        stripeCustomer: true,
        subscription: { include: { items: true } },
        paymentRecords: { orderBy: { createdAt: "desc" }, take: 50 },
        gracePeriodOverrides: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    let paymentMethods: unknown[] = [];
    if (agent.stripeCustomer) {
      try {
        const methods = await stripe.customers.listPaymentMethods(
          agent.stripeCustomer.stripeCustomerId,
        );
        paymentMethods = methods.data;
      } catch {
        // Stripe customer may not exist remotely; proceed without methods
      }
    }

    return NextResponse.json({ agent, paymentMethods });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
