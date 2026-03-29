import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { BillingDashboard } from "@/components/billing/billing-dashboard";

export const metadata: Metadata = { title: "Billing — Dashboard" };

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/dashboard/billing");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent") {
    return <AccessDenied />;
  }

  const [agent, bundleConfigs, entitlements] = await Promise.all([
    prisma.agent.findFirst({
      where: {
        OR: [{ userId: user.id }, { email: user.email ?? "" }],
      },
      include: {
        subscription: {
          include: { items: true },
        },
        stripeCustomer: true,
        paymentRecords: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.bundleConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        productType: true,
        monthlyAmount: true,
        annualAmount: true,
        monthlyPriceId: true,
        annualPriceId: true,
        sortOrder: true,
        features: {
          select: { featureKey: true, limit: true },
        },
      },
    }),
    prisma.entitlementConfig.findMany({
      where: { isActive: true, requiredProduct: { not: null } },
      select: {
        id: true,
        featureKey: true,
        featureName: true,
        requiredProduct: true,
        freeLimit: true,
        description: true,
      },
    }),
  ]);

  if (!agent) {
    return <AccessDenied />;
  }

  const subscription = agent.subscription
    ? {
        status: agent.subscription.status,
        currentPeriodStart: agent.subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: agent.subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: agent.subscription.cancelAtPeriodEnd,
        trialEnd: agent.subscription.trialEnd?.toISOString() ?? null,
        items: agent.subscription.items.map((item) => ({
          productType: item.productType,
          productName: item.productName,
          stripePriceId: item.stripePriceId,
          quantity: item.quantity,
        })),
      }
    : null;

  const paymentRecords = agent.paymentRecords.map((pr) => ({
    id: pr.id,
    amount: pr.amount,
    currency: pr.currency,
    paymentType: pr.paymentType,
    status: pr.status,
    notes: pr.notes,
    createdAt: pr.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-crimson-600 mb-2">
          Agent Tools
        </p>
        <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
          Billing
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your plan, payment methods, invoices, and billing settings.
        </p>
      </div>

      <BillingDashboard
        subscription={subscription}
        paymentRecords={paymentRecords}
        hasStripeCustomer={!!agent.stripeCustomer}
        bundleConfigs={bundleConfigs}
        entitlements={entitlements}
      />
    </div>
  );
}
