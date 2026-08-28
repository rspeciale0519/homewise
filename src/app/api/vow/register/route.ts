import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordVowRegistration, VOW_TERMS_VERSION } from "@/lib/vow";
import { logMlsAccess } from "@/lib/mls-access-log";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { boundedUserAgent, trustedClientIp } from "@/lib/trusted-client";
import { z } from "zod";

const schema = z
  .object({
    accept: z.literal(true),
    termsVersion: z.literal(VOW_TERMS_VERSION).optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 1_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "You must affirmatively accept the VOW Terms of Use." }, { status: 400 });
  }

  const ipAddress = trustedClientIp(request);
  const userAgent = boundedUserAgent(request);
  await recordVowRegistration(user.id, { ipAddress, userAgent });
  await logMlsAccess({ userId: user.id, tier: "vow", action: "vow_register", detail: VOW_TERMS_VERSION, ipAddress });

  return NextResponse.json({ ok: true, termsVersion: VOW_TERMS_VERSION });
}
