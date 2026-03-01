import { NextRequest, NextResponse } from "next/server";
import { propertyAlertSchema } from "@/schemas/property-alert.schema";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = propertyAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await prisma.propertyAlert.upsert({
      where: { email: parsed.data.email },
      update: {
        name: parsed.data.name || null,
        cities: parsed.data.cities,
        minPrice: parsed.data.minPrice ?? null,
        maxPrice: parsed.data.maxPrice ?? null,
        beds: parsed.data.beds ?? null,
        active: true,
      },
      create: {
        email: parsed.data.email,
        name: parsed.data.name || null,
        cities: parsed.data.cities,
        minPrice: parsed.data.minPrice ?? null,
        maxPrice: parsed.data.maxPrice ?? null,
        beds: parsed.data.beds ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
