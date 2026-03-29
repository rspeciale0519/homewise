import { NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const { user } = auth;

  const agent = await prisma.agent.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email ?? "" }],
    },
    include: { stripeCustomer: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!agent.stripeCustomer) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 404 },
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: agent.stripeCustomer.stripeCustomerId,
      return_url: `${SITE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create portal session", detail: message },
      { status: 500 },
    );
  }
}
