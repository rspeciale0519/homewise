"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_VIEWS, type DashboardView } from "@/lib/dashboard-view";

const updateSchema = z.object({
  view: z.enum(DASHBOARD_VIEWS),
});

export type UpdateDashboardViewResult =
  | { ok: true; view: DashboardView }
  | { ok: false; error: string };

export async function updateDashboardView(
  view: DashboardView,
): Promise<UpdateDashboardViewResult> {
  const parsed = updateSchema.safeParse({ view });
  if (!parsed.success) {
    return { ok: false, error: "Invalid dashboard view." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not signed in." };

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can set a default dashboard." };
  }

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { defaultDashboardView: parsed.data.view },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard", "layout");

  return { ok: true, view: parsed.data.view };
}
