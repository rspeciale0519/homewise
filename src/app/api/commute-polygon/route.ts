import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchIsochronePolygon, geocodeAddress } from "@/lib/commute";

const querySchema = z.object({
  address: z.string().min(3).max(300),
  minutes: z.coerce.number().int().min(5).max(60),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const geocoded = await geocodeAddress(parsed.data.address);
  if (!geocoded) {
    return NextResponse.json({ error: "Address not found" }, { status: 422 });
  }

  const polygon = await fetchIsochronePolygon(
    geocoded.latitude,
    geocoded.longitude,
    parsed.data.minutes,
  );
  if (!polygon) {
    return NextResponse.json({ error: "Could not compute drive-time area" }, { status: 502 });
  }

  return NextResponse.json({
    polygon,
    center: { latitude: geocoded.latitude, longitude: geocoded.longitude },
    placeName: geocoded.placeName,
  });
}
