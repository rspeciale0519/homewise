import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const anomalies = await prisma.listingAnomaly.findMany({
    where: { dismissed: false },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      kind: true,
      detail: true,
      createdAt: true,
      listing: { select: { id: true, address: true, city: true, price: true, status: true } },
    },
  });

  return NextResponse.json({ anomalies });
}

const dismissSchema = z.object({ id: z.string().min(1) });

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body: unknown = await request.json().catch(() => null);
  const parsed = dismissSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const updated = await prisma.listingAnomaly.update({
    where: { id: parsed.data.id },
    data: { dismissed: true },
    select: { id: true, dismissed: true },
  });

  return NextResponse.json({ anomaly: updated });
}
