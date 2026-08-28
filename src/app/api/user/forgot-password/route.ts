import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { clientIpRateRule, publicMutationRateLimiter } from "@/lib/public-rate-limit";
import { logApiError } from "@/lib/api-error";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(255) }).strict();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 1_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const { email } = parsed.data;
  const ipRule = clientIpRateRule(request, "password-reset", 30);
  const rateLimit = await publicMutationRateLimiter.consume([
    ...(ipRule ? [ipRule] : []),
    { key: `password-reset:email:${email}`, limit: 5 },
  ]);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.unavailable
          ? "The password reset service is temporarily unavailable. Please try again later."
          : "Too many requests. Please try again later.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const profile = await prisma.userProfile.findUnique({ where: { email } });
  if (profile) {
    try {
      const supabaseAdmin = createAdminClient();
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });

      if (!linkError && linkData.properties.hashed_token) {
        const resetUrl = `${siteUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery&redirectTo=/reset-password`;
        const template = passwordResetEmail(profile.firstName, resetUrl);
        await sendEmail({
          to: email,
          subject: template.subject,
          html: template.html,
        });
      }
    } catch (error) {
      logApiError("user/forgot-password", error);
    }
  }

  return NextResponse.json({ success: true });
}
