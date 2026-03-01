import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const existing = await prisma.userProfile.findUnique({
        where: { id: data.user.id },
      });

      if (!existing) {
        const meta = data.user.user_metadata;
        await prisma.userProfile.create({
          data: {
            id: data.user.id,
            email: data.user.email ?? "",
            firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
            lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
            avatarUrl: (meta?.avatar_url as string) ?? null,
          },
        });
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
