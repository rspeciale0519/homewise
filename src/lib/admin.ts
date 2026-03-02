import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return { user, profile };
}
