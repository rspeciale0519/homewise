import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { MANUAL_LISTING_SELECT, MANUAL_SOURCE } from "@/lib/manual-listings";

const filterSchema = z.object({
  status: z.enum(["pending", "approved", "archived", "all"]).default("pending"),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = filterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const listings = await prisma.listing.findMany({
    where: {
      mlsSource: MANUAL_SOURCE,
      ...(parsed.data.status === "all" ? {} : { manualStatus: parsed.data.status }),
    },
    orderBy: { updatedAt: "desc" },
    select: { ...MANUAL_LISTING_SELECT, listingAgentName: true },
  });

  return NextResponse.json({ listings });
}

const actionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body: unknown = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, mlsSource: true },
  });
  if (!listing || listing.mlsSource !== MANUAL_SOURCE) {
    return NextResponse.json({ error: "Exclusive listing not found" }, { status: 404 });
  }

  const updated = await prisma.listing.update({
    where: { id: parsed.data.id },
    data: { manualStatus: parsed.data.action === "approve" ? "approved" : "archived" },
    select: { id: true, manualStatus: true },
  });

  return NextResponse.json({ listing: updated });
}
