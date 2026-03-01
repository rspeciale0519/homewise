import { NextRequest, NextResponse } from "next/server";
import { homeEvaluationSchema } from "@/schemas/home-evaluation.schema";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = homeEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const evaluation = await prisma.homeEvaluation.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        streetAddress: parsed.data.streetAddress,
        city: parsed.data.city,
        state: parsed.data.state,
        zip: parsed.data.zip,
        bedrooms: parsed.data.bedrooms ?? null,
        bathrooms: parsed.data.bathrooms ?? null,
        sqft: parsed.data.sqft ?? null,
        garageSpaces: parsed.data.garageSpaces ?? null,
        propertyType: parsed.data.propertyType ?? null,
        sellTimeline: parsed.data.sellTimeline ?? null,
        listingStatus: parsed.data.listingStatus ?? null,
        comments: parsed.data.comments || null,
      },
    });

    return NextResponse.json(
      { success: true, id: evaluation.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
