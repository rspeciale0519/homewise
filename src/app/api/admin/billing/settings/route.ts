import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { billingSettingsUpdateSchema } from "@/schemas/billing.schema";

const DEFAULTS = {
  gracePeriodWarningDays: 7,
  gracePeriodUrgentDays: 14,
  gracePeriodLockoutDays: 15,
  invoiceNotifyDays: 7,
  trialDurationDays: 14,
  transitionGraceDays: 30,
  loyaltyDiscountPercent: 20,
};

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const settings = await prisma.billingSettings.findFirst();

    return NextResponse.json({
      settings: settings
        ? {
            id: settings.id,
            gracePeriodWarningDays: settings.gracePeriodWarningDays,
            gracePeriodUrgentDays: settings.gracePeriodUrgentDays,
            gracePeriodLockoutDays: settings.gracePeriodLockoutDays,
            invoiceNotifyDays: settings.invoiceNotifyDays,
            trialDurationDays: settings.trialDurationDays,
            transitionGraceDays: settings.transitionGraceDays,
            loyaltyDiscountPercent: settings.loyaltyDiscountPercent,
            updatedAt: settings.updatedAt,
          }
        : { ...DEFAULTS, id: null, updatedAt: null },
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = billingSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.billingSettings.findFirst();

    const settings = existing
      ? await prisma.billingSettings.update({
          where: { id: existing.id },
          data: parsed.data,
        })
      : await prisma.billingSettings.create({
          data: { ...DEFAULTS, ...parsed.data },
        });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
