import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
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

  const { featureKeys, ...bundleData } = parsed.data;

  try {
    const existing = await prisma.bundleConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const bundle = await prisma.bundleConfig.update({
      where: { id },
      data: bundleData,
      include: { features: true },
    });

    if (featureKeys !== undefined) {
      await prisma.bundleFeature.deleteMany({ where: { bundleId: id } });
      if (featureKeys.length > 0) {
        await prisma.bundleFeature.createMany({
          data: featureKeys.map((featureKey) => ({
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
