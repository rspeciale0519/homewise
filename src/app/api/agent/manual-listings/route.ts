import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { manualListingCreateSchema } from "@/schemas/manual-listing.schema";
import {
  MANUAL_LISTING_SELECT,
  MANUAL_SOURCE,
  manualListingCreateData,
} from "@/lib/manual-listings";

export async function GET() {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;
  if (!auth.agentId && !auth.isAdmin) {
    return NextResponse.json({ error: "Agent profile not linked" }, { status: 403 });
  }

  const listings = await prisma.listing.findMany({
    where: {
      mlsSource: MANUAL_SOURCE,
      ...(auth.isAdmin ? {} : { createdByAgentId: auth.agentId }),
    },
    orderBy: { updatedAt: "desc" },
    select: MANUAL_LISTING_SELECT,
  });

  return NextResponse.json({ listings });
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;
  if (!auth.agentId) {
    return NextResponse.json(
      { error: "Only linked agent accounts can create exclusive listings" },
      { status: 403 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = manualListingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const agent = await prisma.agent.findUnique({
    where: { id: auth.agentId },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, mlsAgentId: true },
  });
  if (!agent) {
    return NextResponse.json({ error: "Agent profile not found" }, { status: 403 });
  }

  const listing = await prisma.listing.create({
    data: manualListingCreateData(parsed.data, agent),
    select: MANUAL_LISTING_SELECT,
  });

  return NextResponse.json({ listing }, { status: 201 });
}
