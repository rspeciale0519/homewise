import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logActivity } from "@/lib/crm/log-activity";

const showingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  propertyId: z.string().min(1),
  propertyAddress: z.string().min(1),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = showingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, phone, propertyId, propertyAddress, preferredDate, preferredTime, message, source } = parsed.data;

  // Upsert contact (create or update existing)
  const contact = await prisma.contact.upsert({
    where: { email },
    create: {
      firstName,
      lastName,
      email,
      phone,
      source: source ?? "showing_request",
      type: "buyer",
      stage: "new_lead",
    },
    update: {
      phone: phone ?? undefined,
    },
  });

  // Log the showing request as an activity
  await logActivity({
    contactId: contact.id,
    type: "form_submission",
    title: "Showing Request Submitted",
    description: `Requested showing for ${propertyAddress}`,
    metadata: {
      propertyId,
      propertyAddress,
      preferredDate,
      preferredTime,
      message,
    },
  });

  // Create a task for the assigned agent (or unassigned)
  await prisma.task.create({
    data: {
      contactId: contact.id,
      assignedTo: contact.assignedAgentId,
      title: `Schedule showing: ${propertyAddress}`,
      description: [
        `Contact: ${firstName} ${lastName} (${email})`,
        phone ? `Phone: ${phone}` : null,
        preferredDate ? `Preferred date: ${preferredDate}` : null,
        preferredTime ? `Preferred time: ${preferredTime}` : null,
        message ? `Note: ${message}` : null,
      ].filter(Boolean).join("\n"),
      dueDate: preferredDate ? new Date(preferredDate) : null,
      priority: "high",
    },
  });

  return NextResponse.json({ success: true, contactId: contact.id }, { status: 201 });
}
