import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { manualListingUpdateSchema } from "@/schemas/manual-listing.schema";
import { MANUAL_LISTING_SELECT, MANUAL_SOURCE } from "@/lib/manual-listings";

type OwnedListing = {
  id: string;
  mlsSource: string;
  createdByAgentId: string | null;
  photos: string[];
  bathsFull: number;
  bathsHalf: number;
};

type OwnedResult =
  | { ok: false; response: NextResponse }
  | { ok: true; listing: OwnedListing };

async function loadOwnedManualListing(
  id: string,
  auth: { agentId: string | null; isAdmin: boolean },
): Promise<OwnedResult> {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      mlsSource: true,
      createdByAgentId: true,
      photos: true,
      bathsFull: true,
      bathsHalf: true,
    },
  });

  if (!listing || listing.mlsSource !== MANUAL_SOURCE) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Exclusive listing not found" }, { status: 404 }),
    };
  }
  if (!auth.isAdmin && listing.createdByAgentId !== auth.agentId) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, listing };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const owned = await loadOwnedManualListing(id, auth);
  if (!owned.ok) return owned.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = manualListingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...data,
      county: data.county === "" ? null : data.county,
      description: data.description === "" ? null : data.description,
      hoaFrequency: data.hoaFrequency === "" ? null : data.hoaFrequency,
      ...(data.bathsFull != null || data.bathsHalf != null
        ? {
            baths:
              (data.bathsFull ?? owned.listing.bathsFull) +
              (data.bathsHalf ?? owned.listing.bathsHalf) * 0.5,
          }
        : {}),
      ...(data.photos ? { imageUrl: data.photos[0] ?? null } : {}),
      // Edits to an approved listing go back through review.
      manualStatus: "pending",
    },
    select: MANUAL_LISTING_SELECT,
  });

  return NextResponse.json({ listing: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const owned = await loadOwnedManualListing(id, auth);
  if (!owned.ok) return owned.response;

  const archived = await prisma.listing.update({
    where: { id },
    data: { manualStatus: "archived" },
    select: { id: true, manualStatus: true },
  });

  return NextResponse.json({ listing: archived });
}
