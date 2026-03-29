import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { entitlementCreateSchema } from "@/schemas/billing.schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const features = await prisma.entitlementConfig.findMany({
      orderBy: { featureName: "asc" },
    });

    return NextResponse.json({ features });
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

  const parsed = entitlementCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const feature = await prisma.entitlementConfig.create({
      data: parsed.data,
    });

    return NextResponse.json({ feature }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
