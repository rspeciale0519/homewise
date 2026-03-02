import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const meta = user.user_metadata;
  const profile = await prisma.userProfile.create({
    data: {
      id: user.id,
      email: user.email ?? "",
      firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
      lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
      avatarUrl: (meta?.avatar_url as string) ?? null,
      role: "user",
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
