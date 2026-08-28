import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logActivity } from "@/lib/crm/log-activity";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import {
  clientIpRateRule,
  publicMutationRateLimiter,
} from "@/lib/public-rate-limit";

const emptyFormValueToUndefined = (value: unknown) => (
  typeof value === "string" && value.trim() === "" ? undefined : value
);

const showingSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().max(30).optional(),
  propertyId: z.string().trim().min(1).max(128),
  propertyAddress: z.string().trim().min(1).max(300),
  preferredDate: z.preprocess(
    emptyFormValueToUndefined,
    z.string().date().optional(),
  ),
  preferredTime: z.preprocess(
    emptyFormValueToUndefined,
    z.enum(["morning", "afternoon", "evening"]).optional(),
  ),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(100).optional(),
}).strict();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 5_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = showingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, phone, propertyId, propertyAddress, preferredDate, preferredTime, message, source } = parsed.data;

  const ipRule = clientIpRateRule(request, "showing", 60);
  const rateLimit = await publicMutationRateLimiter.consume([
    ...(ipRule ? [ipRule] : []),
    { key: `showing:email:${email}`, limit: 5 },
    { key: `showing:property:${propertyId}`, limit: 30 },
  ]);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.unavailable
          ? "The showing service is temporarily unavailable. Please try again later."
          : "Too many showing requests. Please try again later.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

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
