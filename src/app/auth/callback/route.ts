import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { consumeInviteCode } from "@/lib/invite-codes";
import { enrollAgentInAutomaticCourses } from "@/lib/training/enrollment";
import { resolveDashboardPath } from "@/lib/dashboard-view";
import {
  DEFAULT_AUTH_REDIRECT,
  safeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { logApiError } from "@/lib/api-error";

const PENDING_INVITE_COOKIE = "pending_agent_invite";

function safeInviteCode(value: unknown): string {
  return typeof value === "string" && value.length <= 100 ? value : "";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawRedirectTo = searchParams.get("redirectTo");
  const redirectTo = safeAuthRedirectPath(rawRedirectTo);
  const redirectToIsDefault = redirectTo === DEFAULT_AUTH_REDIRECT;
  const inviteCode = searchParams.get("inviteCode");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    }

    if (!error && data.user) {
      const meta = data.user.user_metadata;
      const rawInvite = safeInviteCode(inviteCode ?? meta?.invite_code);

      try {
        await prisma.$transaction(async (tx) => {
          await tx.userProfile.upsert({
            where: { id: data.user.id },
            create: {
              id: data.user.id,
              email: data.user.email ?? "",
              firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
              lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
              avatarUrl: (meta?.avatar_url as string) ?? null,
              role: "user",
            },
            update: {},
          });

          const inviteClaimed = rawInvite && data.user.email
            ? await consumeInviteCode(rawInvite, data.user.id, data.user.email, tx)
            : false;

          if (inviteClaimed) {
            await tx.userProfile.update({
              where: { id: data.user.id },
              data: { role: "agent" },
            });
            await enrollAgentInAutomaticCourses(data.user.id, tx);
          }
        });

        let finalRedirect = redirectTo;
        if (redirectToIsDefault) {
          const profile = await prisma.userProfile.findUnique({
            where: { id: data.user.id },
            select: { role: true, defaultDashboardView: true },
          });
          finalRedirect = resolveDashboardPath(profile);
        }

        return NextResponse.redirect(`${origin}${finalRedirect}`);
      } catch (provisioningError) {
        logApiError("auth/callback/profile-provisioning", provisioningError);
        const retryUrl = new URL("/auth/complete", origin);
        retryUrl.searchParams.set("redirectTo", redirectTo);
        const response = NextResponse.redirect(retryUrl);
        if (rawInvite) {
          response.cookies.set(PENDING_INVITE_COOKIE, rawInvite, {
            httpOnly: true,
            secure: request.nextUrl.protocol === "https:",
            sameSite: "lax",
            maxAge: 10 * 60,
            path: "/auth",
          });
        }
        return response;
      }
    }
  }

  console.error("[auth/callback] Auth failed — code present:", !!code);
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
