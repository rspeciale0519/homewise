import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { BillingDashboard } from "@/components/billing/billing-dashboard";
import { resolveAgentPlatform } from "@/lib/platform/filter";
import type { BillingInterval } from "@/components/billing/types";

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

  if (profile?.role !== "agent" && profile?.role !== "admin") {
    return <AccessDenied />;
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: user.id },
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
  });

  if (!agent && profile.role !== "admin") {
    return <AccessDenied />;
  }

  const platform = resolveAgentPlatform(agent);
  const subscribedPriceIds = agent?.subscription?.items.map(
    (item) => item.stripePriceId,
  ) ?? [];
  const [productConfigs, entitlements] = await Promise.all([
    prisma.productConfig.findMany({
      where: {
        OR: [
          { isActive: true, platforms: { has: platform } },
          { monthlyPriceId: { in: subscribedPriceIds } },
          { annualPriceId: { in: subscribedPriceIds } },
        ],
      },
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
        isActive: true,
        features: {
          select: { featureKey: true, limit: true },
        },
      },
    }),
    prisma.entitlementConfig.findMany({
      where: {
        isActive: true,
        requiredProduct: { not: null },
        platforms: { has: platform },
      },
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

  const subscription = agent?.subscription
    ? {
        status: agent.subscription.status,
        currentPeriodStart: agent.subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: agent.subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: agent.subscription.cancelAtPeriodEnd,
        trialEnd: agent.subscription.trialEnd?.toISOString() ?? null,
        items: agent.subscription.items.map((item) => {
          const product = productConfigs.find(
            (config) =>
              config.monthlyPriceId === item.stripePriceId ||
              config.annualPriceId === item.stripePriceId,
          );
          const billingInterval: BillingInterval | null =
            product?.annualPriceId === item.stripePriceId
              ? "annual"
              : product?.monthlyPriceId === item.stripePriceId
                ? "monthly"
                : null;
          const billingAmount = billingInterval === "annual"
            ? (product?.annualAmount ?? null)
            : billingInterval === "monthly"
              ? (product?.monthlyAmount ?? null)
              : null;

          return {
            productType: item.productType,
            productName: item.productName,
            stripePriceId: item.stripePriceId,
            quantity: item.quantity,
            billingInterval,
            billingAmount,
          };
        }),
      }
    : null;

  const paymentRecords =
    agent?.paymentRecords.map((pr) => ({
      id: pr.id,
      amount: pr.amount,
      currency: pr.currency,
      paymentType: pr.paymentType,
      status: pr.status,
      notes: pr.notes,
      createdAt: pr.createdAt.toISOString(),
    })) ?? [];

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
        hasStripeCustomer={!!agent?.stripeCustomer}
        productConfigs={productConfigs}
        entitlements={entitlements}
      />
    </div>
  );
}
