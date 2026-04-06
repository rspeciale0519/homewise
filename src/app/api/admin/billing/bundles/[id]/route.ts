import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { bundleUpdateSchema } from "@/schemas/billing.schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  try {
    const bundle = await prisma.bundleConfig.findUnique({
      where: { id },
      include: { features: true },
    });

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bundleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.bundleConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const immutableFieldChanges = [
      parsed.data.slug !== undefined && parsed.data.slug !== existing.slug
        ? "slug"
        : null,
      parsed.data.productType !== undefined &&
      parsed.data.productType !== existing.productType
        ? "product type"
        : null,
      parsed.data.monthlyAmount !== undefined &&
      parsed.data.monthlyAmount !== existing.monthlyAmount
        ? "monthly amount"
        : null,
      parsed.data.annualAmount !== undefined &&
      parsed.data.annualAmount !== existing.annualAmount
        ? "annual amount"
        : null,
    ].filter((value): value is string => value !== null);

    if (immutableFieldChanges.length > 0) {
      return NextResponse.json(
        {
          error:
            "Existing bundles cannot change slug, product type, or billing amounts. Create a new bundle for pricing or product changes.",
          details: immutableFieldChanges,
        },
        { status: 400 },
      );
    }

    if (
      existing.stripeProductId &&
      (parsed.data.name !== undefined || parsed.data.description !== undefined)
    ) {
      await stripe.products.update(existing.stripeProductId, {
        name: parsed.data.name ?? existing.name,
        description: parsed.data.description ?? existing.description,
        metadata: {
          slug: existing.slug,
          productType: existing.productType,
        },
      });
    }

    const bundleData = {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
    };

    const bundle = await prisma.bundleConfig.update({
      where: { id },
      data: bundleData,
      include: { features: true },
    });

    if (parsed.data.featureKeys !== undefined) {
      await prisma.bundleFeature.deleteMany({ where: { bundleId: id } });
      if (parsed.data.featureKeys.length > 0) {
        await prisma.bundleFeature.createMany({
          data: parsed.data.featureKeys.map((featureKey) => ({
            bundleId: id,
            featureKey,
          })),
        });
      }

      const updated = await prisma.bundleConfig.findUnique({
        where: { id },
        include: { features: true },
      });
      return NextResponse.json({ bundle: updated });
    }

    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  try {
    const existing = await prisma.bundleConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const bundle = await prisma.bundleConfig.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
