import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { entitlementUpdateSchema } from "@/schemas/billing.schema";

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

  const parsed = entitlementUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.entitlementConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 },
      );
    }

    const feature = await prisma.entitlementConfig.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ feature });
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
    const existing = await prisma.entitlementConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 },
      );
    }

    const feature = await prisma.entitlementConfig.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ feature });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
