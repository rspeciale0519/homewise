import { NextRequest, NextResponse } from "next/server";
import { homeEvaluationSchema } from "@/schemas/home-evaluation.schema";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/crm/log-activity";

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

    // Create/update CRM contact as seller lead (B3)
    const nameParts = parsed.data.name.split(" ");
    const firstName = nameParts[0] ?? parsed.data.name;
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    const contact = await prisma.contact.upsert({
      where: { email: parsed.data.email },
      create: {
        firstName,
        lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        source: "home_evaluation",
        type: "seller",
        stage: "new_lead",
        tags: {
          create: {
            tag: {
              connectOrCreate: {
                where: { name: "seller" },
                create: { name: "seller", color: "#f59e0b" },
              },
            },
          },
        },
      },
      update: {
        phone: parsed.data.phone,
      },
    });

    await logActivity({
      contactId: contact.id,
      type: "form_submission",
      title: "Home Evaluation Requested",
      description: `${parsed.data.streetAddress}, ${parsed.data.city}, ${parsed.data.state} ${parsed.data.zip}`,
      metadata: {
        evaluationId: evaluation.id,
        address: parsed.data.streetAddress,
        city: parsed.data.city,
        propertyType: parsed.data.propertyType,
        sellTimeline: parsed.data.sellTimeline,
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
