import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const { email } = parsed.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const profile = await prisma.userProfile.findUnique({ where: { email } });
  if (!profile) {
    return NextResponse.json({ success: true });
  }

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

  return NextResponse.json({ success: true });
}
