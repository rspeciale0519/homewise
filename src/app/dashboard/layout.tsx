import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardToaster } from "@/components/dashboard/dashboard-toaster";

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

    existing = await prisma.userProfile.create({
      data: {
        id: user.id,
        email: user.email ?? "",
        firstName: (meta?.first_name as string) ?? "",
        lastName: (meta?.last_name as string) ?? "",
        avatarUrl: (meta?.avatar_url as string) ?? null,
        role: "user",
      },
    });
  }

  const userRole = existing.role ?? "user";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <div className="flex min-h-[calc(100vh-5rem)]">
        <Sidebar role={userRole} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <DashboardToaster />
    </div>
  );
}
