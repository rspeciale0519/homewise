import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DASHBOARD_PATH,
  resolveDashboardPath,
} from "@/lib/dashboard-view";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ path: DEFAULT_DASHBOARD_PATH }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true, defaultDashboardView: true },
  });

  return NextResponse.json({ path: resolveDashboardPath(profile) });
}
