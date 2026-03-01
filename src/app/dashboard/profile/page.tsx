import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) redirect("/dashboard");

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-display-sm text-navy-700">Profile</h1>
        <p className="mt-2 text-sm text-slate-500">
          Update your personal information.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <ProfileForm
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone ?? "",
          }}
          email={profile.email}
        />
      </div>
    </div>
  );
}
