import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordVowRegistration, VOW_TERMS_VERSION } from "@/lib/vow";
import { logMlsAccess } from "@/lib/mls-access-log";
import { z } from "zod";

const schema = z.object({ accept: z.literal(true), termsVersion: z.string().optional() });

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "You must affirmatively accept the VOW Terms of Use." }, { status: 400 });
  }

  const ipAddress = clientIp(request);
  const userAgent = request.headers.get("user-agent");
  await recordVowRegistration(user.id, { ipAddress, userAgent });
  await logMlsAccess({ userId: user.id, tier: "vow", action: "vow_register", detail: VOW_TERMS_VERSION, ipAddress });

  return NextResponse.json({ ok: true, termsVersion: VOW_TERMS_VERSION });
}
