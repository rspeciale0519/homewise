import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVowStatus } from "@/lib/vow";
import { VowTermsGate } from "./vow-terms-gate";
import { VowCompsSearch } from "./vow-comps-search";

export const metadata: Metadata = {
  title: "Registered Consumer Search (VOW) | Home Wise Realty Group",
  description: "Expanded MLS search for registered Home Wise consumers.",
  robots: { index: false, follow: false },
};

export default async function VowPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vow");

  const status = await getVowStatus(user.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crimson-600">
        Registered Consumer Portal
      </p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mt-1 mb-2">
        Virtual Office Website Search
      </h1>
      <p className="text-slate-500 mb-8 max-w-2xl">
        As a registered Home Wise consumer you have access to expanded MLS data —
        including recently sold comparables — under the supervision of a Home Wise
        broker, as permitted by the Stellar MLS Virtual Office Website (VOW) program.
      </p>

      {status.registered ? (
        <VowCompsSearch />
      ) : (
        <VowTermsGate needsReaccept={status.needsReaccept} />
      )}
    </div>
  );
}
