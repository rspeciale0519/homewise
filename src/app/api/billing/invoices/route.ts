import { NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const agent = await prisma.agent.findFirst({
    where: { email: auth.profile.email ?? undefined },
    include: { stripeCustomer: true, subscription: { include: { items: true } } },
  });

  if (!agent?.stripeCustomer) {
    return NextResponse.json({ error: "No billing account" }, { status: 404 });
  }

  const stripeCustomerId = agent.stripeCustomer.stripeCustomerId;

  try {
    const invoiceList = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 20,
    });

    const invoices = invoiceList.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      status: inv.status,
      created: inv.created,
      invoice_pdf: inv.invoice_pdf ?? null,
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
      lines: inv.lines.data.map((line) => ({
        id: line.id,
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    }));

    let upcomingInvoice: {
      amount_due: number;
      currency: string;
      next_payment_attempt: number | null;
      lines: {
        id: string;
        description: string | null;
        amount: number;
        quantity: number | null;
      }[];
    } | null = null;

    try {
      const upcoming = await stripe.invoices.createPreview({
        customer: stripeCustomerId,
      });
      upcomingInvoice = {
        amount_due: upcoming.amount_due,
        currency: upcoming.currency,
        next_payment_attempt: upcoming.next_payment_attempt ?? null,
        lines: upcoming.lines.data.map((line) => ({
          id: line.id,
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
        })),
      };
    } catch {
      // No upcoming invoice (e.g. no active subscription)
    }

    return NextResponse.json({ invoices, upcomingInvoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list invoices", detail: message },
      { status: 500 },
    );
  }
}
