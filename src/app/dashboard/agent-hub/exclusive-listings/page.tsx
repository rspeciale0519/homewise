import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { ManualListingManager } from "@/components/agent/manual-listing-manager";

export const metadata = { title: "Exclusive Listings" };

export default async function ExclusiveListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "agent" && profile?.role !== "admin") {
    return <AccessDenied />;
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-semibold text-navy-700 mb-1">Exclusive Listings</h1>
      <ManualListingManager />
    </div>
  );
}
