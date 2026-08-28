import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  productCreateSchema,
  type ProductCreateInput,
} from "@/schemas/billing.schema";

interface StoredProductSetup {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyAmount: number;
  annualAmount: number;
  productType: string;
  isActive: boolean;
  sortOrder: number;
  stripeProductId: string | null;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  features: { featureKey: string }[];
}

type ProductSetupDisposition = "complete" | "resumable" | "conflict";

function productMatchesInput(
  product: StoredProductSetup,
  input: ProductCreateInput,
  compareActiveState: boolean,
): boolean {
  const storedFeatureKeys = new Set(
    product.features.map((feature) => feature.featureKey),
  );

  return product.name === input.name &&
    product.slug === input.slug &&
    product.description === input.description &&
    product.monthlyAmount === input.monthlyAmount &&
    product.annualAmount === input.annualAmount &&
    product.productType === input.productType &&
    product.sortOrder === input.sortOrder &&
    (!compareActiveState || product.isActive === input.isActive) &&
    storedFeatureKeys.size === input.featureKeys.length &&
    input.featureKeys.every((featureKey) => storedFeatureKeys.has(featureKey));
}

function getProductSetupDisposition(
  product: StoredProductSetup,
  input: ProductCreateInput,
): ProductSetupDisposition {
  const isComplete = Boolean(
    product.stripeProductId &&
    product.monthlyPriceId &&
    product.annualPriceId,
  );
  if (isComplete) {
    return productMatchesInput(product, input, true) ? "complete" : "conflict";
  }

  const isRecoverableReservation =
    !product.isActive &&
    product.monthlyPriceId === null &&
    product.annualPriceId === null;
  return isRecoverableReservation && productMatchesInput(product, input, false)
    ? "resumable"
    : "conflict";
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002";
}

function productConflictResponse() {
  return NextResponse.json(
    { error: "A bundle with this slug already exists with different settings" },
    { status: 409 },
  );
}

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const bundles = await prisma.productConfig.findMany({
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
    body = await readJsonBodyWithLimit(request, 10_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = productCreateSchema.safeParse(body);
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
    let bundle = await prisma.productConfig.findUnique({
      where: { slug },
      include: { features: true },
    });
    let createdReservation = false;

    if (!bundle) {
      try {
        // Reserve the slug before Stripe calls and keep partial setup inactive.
        bundle = await prisma.productConfig.create({
          data: {
            name,
            slug,
            description,
            monthlyAmount,
            annualAmount,
            productType,
            isActive: false,
            sortOrder,
            features: {
              create: featureKeys.map((featureKey) => ({ featureKey })),
            },
          },
          include: { features: true },
        });
        createdReservation = true;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        bundle = await prisma.productConfig.findUnique({
          where: { slug },
          include: { features: true },
        });
        if (!bundle) throw error;
      }
    }

    const disposition = getProductSetupDisposition(bundle, parsed.data);
    if (disposition === "conflict") {
      return productConflictResponse();
    }
    if (disposition === "complete") {
      return NextResponse.json({ bundle });
    }

    let stripeProductId = bundle.stripeProductId;
    if (!stripeProductId) {
      const product = await stripe.products.create(
        {
          name,
          description,
          metadata: {
            slug,
            productType,
            productConfigId: bundle.id,
          },
        },
        {
          idempotencyKey: `admin-billing-product:${bundle.id}:product`,
        },
      );
      stripeProductId = product.id;
      await prisma.productConfig.update({
        where: { id: bundle.id },
        data: { stripeProductId },
      });
    }

    const monthlyPrice = await stripe.prices.create(
      {
        product: stripeProductId,
        unit_amount: monthlyAmount,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: {
          productConfigId: bundle.id,
          billingInterval: "monthly",
        },
      },
      {
        idempotencyKey: `admin-billing-product:${bundle.id}:monthly-price`,
      },
    );
    const annualPrice = await stripe.prices.create(
      {
        product: stripeProductId,
        unit_amount: annualAmount,
        currency: "usd",
        recurring: { interval: "year" },
        metadata: {
          productConfigId: bundle.id,
          billingInterval: "annual",
        },
      },
      {
        idempotencyKey: `admin-billing-product:${bundle.id}:annual-price`,
      },
    );

    // Publish both prices and the requested active state in one database update.
    const completedBundle = await prisma.productConfig.update({
      where: { id: bundle.id },
      data: {
        stripeProductId,
        monthlyPriceId: monthlyPrice.id,
        annualPriceId: annualPrice.id,
        isActive,
      },
      include: { features: true },
    });

    return NextResponse.json(
      { bundle: completedBundle },
      { status: createdReservation ? 201 : 200 },
    );
  } catch (err) {
    logApiError("admin/billing/products/create", err);
    return NextResponse.json(
      { error: "Failed to create bundle" },
      { status: 500 },
    );
  }
}
