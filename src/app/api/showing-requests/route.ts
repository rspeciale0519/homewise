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

  const existingContact = await prisma.contact.findUnique({
    where: { email },
    select: { id: true, assignedAgentId: true },
  });

  const contact = existingContact
    ? null
    : await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          source: source ?? "showing_request",
          type: "buyer",
          stage: "new_lead",
        },
      });

  if (contact) {
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
  }

  // Create a task for the assigned agent (or unassigned)
  await prisma.task.create({
    data: {
      contactId: contact?.id ?? null,
      assignedTo: contact?.id ? null : existingContact?.assignedAgentId,
      title: `Schedule showing: ${propertyAddress}`,
      description: [
        contact
          ? "Verified contact created from a new public submission."
          : "Unverified public submission for an existing CRM email. Review before merging into the contact record.",
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

  return NextResponse.json({ success: true, contactId: contact?.id ?? null }, { status: 201 });
}
