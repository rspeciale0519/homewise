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

    // Create a CRM contact only for new email addresses.
    // Existing contacts require a manual/admin review path so anonymous users
    // cannot mutate or append activity to an existing CRM record by spoofing email.
    const nameParts = parsed.data.name.split(" ");
    const firstName = nameParts[0] ?? parsed.data.name;
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    const existingContact = await prisma.contact.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, assignedAgentId: true },
    });

    const contact = existingContact
      ? null
      : await prisma.contact.create({
          data: {
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
        });

    if (contact) {
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
    } else {
      await prisma.task.create({
        data: {
          assignedTo: existingContact?.assignedAgentId ?? null,
          title: `Review home evaluation: ${parsed.data.streetAddress}`,
          description: [
            "Unverified public submission for an existing CRM email. Review before attaching it to the contact record.",
            `Contact: ${parsed.data.name} (${parsed.data.email})`,
            `Address: ${parsed.data.streetAddress}, ${parsed.data.city}, ${parsed.data.state} ${parsed.data.zip}`,
            parsed.data.phone ? `Phone: ${parsed.data.phone}` : null,
            parsed.data.propertyType ? `Property type: ${parsed.data.propertyType}` : null,
            parsed.data.sellTimeline ? `Sell timeline: ${parsed.data.sellTimeline}` : null,
          ].filter(Boolean).join("\n"),
          priority: "high",
        },
      });
    }

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
