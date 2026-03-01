import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  let existing = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!existing) {
    const meta = user.user_metadata;
    const isAgent = (meta?.invite_code as string) === process.env.AGENT_INVITE_CODE;

    existing = await prisma.userProfile.create({
      data: {
        id: user.id,
        email: user.email ?? "",
        firstName: (meta?.first_name as string) ?? "",
        lastName: (meta?.last_name as string) ?? "",
        avatarUrl: (meta?.avatar_url as string) ?? null,
        role: isAgent ? "agent" : "user",
      },
    });
  }

  const userRole = existing.role ?? "user";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <DashboardHeader />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar role={userRole} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
