import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { stripe } from "@/lib/stripe";
import { couponCreateSchema } from "@/schemas/billing.schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const coupons = await stripe.coupons.list({ limit: 100 });

    return NextResponse.json({ coupons: coupons.data });
  } catch (err) {
    logApiError("admin/billing/coupons/list", err);
    return NextResponse.json(
      { error: "Failed to list coupons" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = couponCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, percentOff, amountOff, duration, durationInMonths, maxRedemptions } =
    parsed.data;

  try {
    const coupon = await stripe.coupons.create({
      name,
      ...(percentOff !== undefined ? { percent_off: percentOff } : {}),
      ...(amountOff !== undefined
        ? { amount_off: amountOff, currency: "usd" }
        : {}),
      duration,
      ...(duration === "repeating" && durationInMonths
        ? { duration_in_months: durationInMonths }
        : {}),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    logApiError("admin/billing/coupons/create", err);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 },
    );
  }
}
