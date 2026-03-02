import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsActions } from "./settings-actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hasPasswordProvider = user.app_metadata?.providers?.includes("email") ?? false;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-serif text-display-sm text-navy-700">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your account preferences and security.
        </p>
      </div>

      <div className="space-y-6">
        {/* Security */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-4">Security</h2>
          <SettingsActions hasPasswordProvider={hasPasswordProvider} email={user.email ?? ""} />
        </section>

        {/* Danger zone */}
        <section className="bg-white rounded-2xl border border-crimson-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-crimson-700 uppercase tracking-wider mb-2">Danger Zone</h2>
          <p className="text-sm text-slate-500 mb-4">
            Deleting your account is permanent and cannot be undone.
            Contact support to request account deletion.
          </p>
          <a
            href="mailto:info@homewisefl.com?subject=Account Deletion Request"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-crimson-200 text-sm font-medium text-crimson-600 hover:bg-crimson-50 transition-colors"
          >
            Request Account Deletion
          </a>
        </section>
      </div>
    </div>
  );
}
