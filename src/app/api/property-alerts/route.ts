import { NextRequest, NextResponse } from "next/server";
import { propertyAlertSchema } from "@/schemas/property-alert.schema";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { clientIpRateRule, publicMutationRateLimiter } from "@/lib/public-rate-limit";
import {
  buildEmailHtml,
  escapeHtml,
  escapeHttpUrl,
  sendEmail,
} from "@/lib/email";
import {
  assertEmailActionSecretConfigured,
  createPropertyAlertConfirmationToken,
} from "@/lib/email/action-token";
import { getSiteUrl } from "@/lib/site-url";
import {
  prepareAnonymousPropertyAlert,
  releasePropertyAlertEmailCooldown,
  type PreparedAnonymousAlert,
} from "@/lib/property-alert-signup";

async function sendAnonymousAlertEmail(prepared: PreparedAnonymousAlert): Promise<void> {
  if (prepared.kind === "cooldown") return;

  try {
    const greeting = prepared.name
      ? `<p>Hello ${escapeHtml(prepared.name)},</p>`
      : "";
    let subject: string;
    let content: string;

    if (prepared.kind === "confirmation") {
      const token = createPropertyAlertConfirmationToken({
        alertId: prepared.alertId,
        email: prepared.email,
        verificationVersion: prepared.verificationVersion,
      });
      const confirmationUrl = new URL("/property-updates/confirm", getSiteUrl());
      confirmationUrl.searchParams.set("token", token);
      subject = "Confirm your Homewise property alerts";
      content = `
        ${greeting}
        <p>Confirm your email address to start your property alerts.</p>
        <p><a class="btn" href="${escapeHttpUrl(confirmationUrl.toString())}">Confirm property alerts</a></p>
        <p>This link expires in 24 hours. Ignore this message if you did not request it.</p>
      `;
    } else {
      const signInUrl = escapeHttpUrl(`${getSiteUrl()}/login`);
      subject = "Your Homewise property alert is already set up";
      content = `
        ${greeting}
        <p>We received a request for property alerts at this email address.</p>
        <p>Your existing alert settings did not change.</p>
        <p><a class="btn" href="${signInUrl}">Sign in to manage alerts</a></p>
        <p>Ignore this message if you did not request it.</p>
      `;
    }

    const emailResult = await sendEmail({
      to: prepared.email,
      subject,
      html: buildEmailHtml(content, subject, false),
    });
    if (!emailResult.error) return;
    console.error("[property-alerts] confirmation email failed", { alertId: prepared.alertId });
  } catch (error) {
    console.error("[property-alerts] confirmation email failed", {
      alertId: prepared.alertId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  await releasePropertyAlertEmailCooldown(prepared.alertId, prepared.sentAt);
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await readJsonBodyWithLimit(request, 5_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = propertyAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const authenticatedEmail = user?.email ?? null;

    if (authenticatedEmail && parsed.data.email !== authenticatedEmail) {
      return NextResponse.json(
        { error: "Authenticated users can only manage alerts for their own email." },
        { status: 403 }
      );
    }

    const alertEmail = authenticatedEmail ?? parsed.data.email;
    const ipRule = clientIpRateRule(request, "property-alert", 60);
    const rateLimit = await publicMutationRateLimiter.consume([
      ...(ipRule ? [ipRule] : []),
      { key: `property-alert:email:${alertEmail}`, limit: 5 },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The alert service is temporarily unavailable. Please try again later."
            : "Too many alert requests. Please try again later.",
        },
        {
          status: rateLimit.unavailable ? 503 : 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }
    if (!user) {
      assertEmailActionSecretConfigured();
      const prepared = await prepareAnonymousPropertyAlert(parsed.data);
      await sendAnonymousAlertEmail(prepared);

      return NextResponse.json(
        { success: true, pendingConfirmation: true },
        { status: 202 },
      );
    }

    const existingAlert = await prisma.propertyAlert.findUnique({
      where: { email: alertEmail },
      select: { email: true },
    });

    if (!existingAlert) {
      await prisma.propertyAlert.create({
        data: {
          email: alertEmail,
          name: parsed.data.name || null,
          cities: parsed.data.cities,
          minPrice: parsed.data.minPrice ?? null,
          maxPrice: parsed.data.maxPrice ?? null,
          beds: parsed.data.beds ?? null,
          emailVerifiedAt: new Date(),
          userId: user.id,
        },
      });
    } else {
      await prisma.propertyAlert.update({
        where: { email: alertEmail },
        data: {
          name: parsed.data.name || null,
          cities: parsed.data.cities,
          minPrice: parsed.data.minPrice ?? null,
          maxPrice: parsed.data.maxPrice ?? null,
          beds: parsed.data.beds ?? null,
          active: true,
          verificationRequired: false,
          verificationVersion: { increment: 1 },
          emailVerifiedAt: new Date(),
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[property-alerts] request failed", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
