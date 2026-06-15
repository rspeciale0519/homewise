import { NextRequest, NextResponse } from "next/server";
import { agentApplicationSchema } from "@/schemas/agent-application.schema";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  agentApplicationReceivedEmail,
  agentApplicationAdminNotificationEmail,
} from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    // Honeypot: a filled "company" field means a bot. Silently accept, do nothing.
    if (body && typeof body === "object" && "company" in body && (body as { company?: unknown }).company) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const parsed = agentApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // HomeWise applications require MLS access; the no-MLS branch never submits here.
    if (!data.hasMlsAccess) {
      return NextResponse.json(
        { error: "Active MLS access is required to apply to HomeWise." },
        { status: 400 }
      );
    }

    // Avoid duplicate pending applications for the same email.
    const existing = await prisma.agentApplication.findFirst({
      where: { email: data.email, status: "pending" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, id: existing.id }, { status: 201 });
    }

    const application = await prisma.agentApplication.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        licenseNumber: data.licenseNumber || null,
        hasMlsAccess: data.hasMlsAccess,
        mlsAgentId: data.mlsAgentId || null,
        message: data.message || null,
      },
    });

    // Notifications are best-effort — a delivery failure must not fail the submission.
    const reviewUrl = `${request.nextUrl.origin}/admin/agent-applications/${application.id}`;
    const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.RESEND_FROM_EMAIL;

    try {
      const confirm = agentApplicationReceivedEmail(data.firstName);
      await sendEmail({ to: data.email, subject: confirm.subject, html: confirm.html });
    } catch (err) {
      console.error("[agent-application] applicant email failed:", err);
    }

    if (adminTo) {
      try {
        const notify = agentApplicationAdminNotificationEmail(application, reviewUrl);
        await sendEmail({ to: adminTo, subject: notify.subject, html: notify.html });
      } catch (err) {
        console.error("[agent-application] admin email failed:", err);
      }
    }

    return NextResponse.json({ success: true, id: application.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
