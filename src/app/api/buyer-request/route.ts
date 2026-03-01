import { NextRequest, NextResponse } from "next/server";
import { buyerRequestSchema } from "@/schemas/buyer-request.schema";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = buyerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await prisma.buyerRequest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        areasOfInterest: parsed.data.areasOfInterest || null,
        minPrice: parsed.data.minPrice ?? null,
        maxPrice: parsed.data.maxPrice ?? null,
        beds: parsed.data.beds ?? null,
        baths: parsed.data.baths ?? null,
        propertyTypes: parsed.data.propertyTypes ?? [],
        timeline: parsed.data.timeline || null,
        comments: parsed.data.comments || null,
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
