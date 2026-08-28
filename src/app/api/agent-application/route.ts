import { NextRequest, NextResponse } from "next/server";
import { agentApplicationSchema } from "@/schemas/agent-application.schema";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  agentApplicationReceivedEmail,
  agentApplicationAdminNotificationEmail,
} from "@/lib/email/templates";
import { SITE_URL } from "@/lib/constants";
import { logApiError } from "@/lib/api-error";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { clientIpRateRule, publicMutationRateLimiter } from "@/lib/public-rate-limit";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await readJsonBodyWithLimit(request, 6_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

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
    const ipRule = clientIpRateRule(request, "agent-application", 10);
    const rateLimit = await publicMutationRateLimiter.consume([
      ...(ipRule ? [ipRule] : []),
      { key: `agent-application:email:${data.email}`, limit: 3 },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The application service is temporarily unavailable. Please try again later."
            : "Too many applications. Please try again later.",
        },
        {
          status: rateLimit.unavailable ? 503 : 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

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
    // Build links from the trusted configured base URL, never the request Host header.
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, "");
    const reviewUrl = `${baseUrl}/admin/agent-applications/${application.id}`;
    const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.RESEND_FROM_EMAIL;

    try {
      const confirm = agentApplicationReceivedEmail(data.firstName);
      await sendEmail({ to: data.email, subject: confirm.subject, html: confirm.html });
    } catch (err) {
      logApiError("agent-application/applicant-email", err);
    }

    if (adminTo) {
      try {
        const notify = agentApplicationAdminNotificationEmail(application, reviewUrl);
        await sendEmail({ to: adminTo, subject: notify.subject, html: notify.html });
      } catch (err) {
        logApiError("agent-application/admin-email", err);
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
