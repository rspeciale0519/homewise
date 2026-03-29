import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { bundleCreateSchema } from "@/schemas/billing.schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const bundles = await prisma.bundleConfig.findMany({
      include: { features: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ bundles });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
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

  const parsed = bundleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    name,
    slug,
    description,
    monthlyAmount,
    annualAmount,
    productType,
    isActive,
    sortOrder,
    featureKeys,
  } = parsed.data;

  try {
    const product = await stripe.products.create({
      name,
      description,
      metadata: { slug, productType },
    });

    const [monthlyPrice, annualPrice] = await Promise.all([
      stripe.prices.create({
        product: product.id,
        unit_amount: monthlyAmount,
        currency: "usd",
        recurring: { interval: "month" },
      }),
      stripe.prices.create({
        product: product.id,
        unit_amount: annualAmount,
        currency: "usd",
        recurring: { interval: "year" },
      }),
    ]);

    const bundle = await prisma.bundleConfig.create({
      data: {
        name,
        slug,
        description,
        stripeProductId: product.id,
        monthlyPriceId: monthlyPrice.id,
        annualPriceId: annualPrice.id,
        monthlyAmount,
        annualAmount,
        productType,
        isActive,
        sortOrder,
        features: {
          create: featureKeys.map((featureKey) => ({ featureKey })),
        },
      },
      include: { features: true },
    });

    return NextResponse.json({ bundle }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create bundle", detail: message },
      { status: 500 },
    );
  }
}
