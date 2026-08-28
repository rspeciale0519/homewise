import { NextRequest, NextResponse } from "next/server";
import { propertyFilterSchema } from "@/schemas/property-filter.schema";
import { propertyProvider } from "@/providers";
import type { PropertyFilters } from "@/providers/property-provider";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parsed = propertyFilterSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { north, south, east, west, polygon, ...rest } = parsed.data;

  const filters: PropertyFilters = { ...rest };

  if (north !== undefined && south !== undefined && east !== undefined && west !== undefined) {
    filters.bounds = { north, south, east, west };
  }

  if (polygon) filters.polygon = polygon;

  const result = await propertyProvider.search(filters);

  return NextResponse.json(result);
}
