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
  const { origin, searchParams } = request.nextUrl;
  const redirectTo = safeAuthRedirectPath(searchParams.get("redirectTo"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const meta = user.user_metadata;
  const rawInvite = safeInviteCode(
    request.cookies.get(PENDING_INVITE_COOKIE)?.value ?? meta?.invite_code,
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userProfile.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email ?? "",
          firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
          lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
          avatarUrl: (meta?.avatar_url as string) ?? null,
          role: "user",
        },
        update: {},
      });

      const inviteClaimed = rawInvite && user.email
        ? await consumeInviteCode(rawInvite, user.id, user.email, tx)
        : false;
      if (inviteClaimed) {
        await tx.userProfile.update({
          where: { id: user.id },
          data: { role: "agent" },
        });
        await enrollAgentInAutomaticCourses(user.id, tx);
      }
    });

    let finalRedirect = redirectTo;
    if (redirectTo === DEFAULT_AUTH_REDIRECT) {
      const profile = await prisma.userProfile.findUnique({
        where: { id: user.id },
        select: { role: true, defaultDashboardView: true },
      });
      finalRedirect = resolveDashboardPath(profile);
    }

    const response = NextResponse.redirect(`${origin}${finalRedirect}`);
    response.cookies.delete(PENDING_INVITE_COOKIE);
    return response;
  } catch (error) {
    logApiError("auth/complete/profile-provisioning", error);
    return NextResponse.json(
      { error: "Account setup is temporarily unavailable. Refresh this page to try again." },
      { status: 503 },
    );
  }
}
