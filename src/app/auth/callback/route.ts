import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { validateInviteCode, consumeInviteCode } from "@/lib/invite-codes";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const inviteCode = searchParams.get("inviteCode");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    }

    if (!error && data.user) {
      const existing = await prisma.userProfile.findUnique({
        where: { id: data.user.id },
      });

      if (!existing) {
        const meta = data.user.user_metadata;
        const rawInvite = inviteCode ?? (meta?.invite_code as string) ?? "";

        // Check per-agent invite code first
        const agentInvite = rawInvite ? await validateInviteCode(rawInvite) : null;
        const isPerAgentInvite = agentInvite?.valid === true;

        // Fall back to legacy shared code
        const legacyCode = process.env.AGENT_INVITE_CODE;
        const isLegacyAgent = !isPerAgentInvite && !!legacyCode && rawInvite === legacyCode;

        const isAgent = isPerAgentInvite || isLegacyAgent;

        await prisma.userProfile.create({
          data: {
            id: data.user.id,
            email: data.user.email ?? "",
            firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
            lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
            avatarUrl: (meta?.avatar_url as string) ?? null,
            role: isAgent ? "agent" : "user",
          },
        });

        // Link agent record to user profile if per-agent invite
        if (isPerAgentInvite) {
          await consumeInviteCode(rawInvite, data.user.id);
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  console.error("[auth/callback] Auth failed — code present:", !!code);
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
