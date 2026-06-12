import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";

export const metadata = { title: "Open House RSVPs" };

export default async function AgentRsvpsPage() {
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

  const agent = await prisma.agent.findFirst({
    where: { userId: user.id },
    select: { mlsAgentId: true },
  });
  const mlsAgentId = normalizeMlsAgentId(agent?.mlsAgentId);

  const rsvps = mlsAgentId
    ? await prisma.openHouseRsvp.findMany({
        where: { listing: { listingAgentMlsId: mlsAgentId } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          slotDate: true,
          createdAt: true,
          listing: { select: { id: true, address: true, city: true } },
        },
      })
    : [];

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-semibold text-navy-700 mb-1">Open House RSVPs</h1>
      <p className="text-sm text-slate-500 mb-6">
        Visitors who said they&apos;ll attend an open house at one of your listings.
      </p>

      {!mlsAgentId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
          Your profile has no MLS Agent ID yet, so RSVPs can&apos;t be matched to your listings.
          Ask an admin to add it on your agent profile.
        </div>
      )}

      {mlsAgentId && rsvps.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm text-slate-500">
          No RSVPs yet. They&apos;ll appear here as soon as a visitor signs up for one of your open houses.
        </div>
      )}

      {rsvps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Visitor</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Property</th>
                <th className="px-5 py-3">Open House</th>
                <th className="px-5 py-3">RSVP&apos;d</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((rsvp) => (
                <tr key={rsvp.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-navy-700">{rsvp.name}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {rsvp.email}
                    {rsvp.phone ? <span className="block text-xs text-slate-400">{rsvp.phone}</span> : null}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/properties/${rsvp.listing.id}`} className="text-navy-700 hover:text-crimson-600 transition-colors">
                      {rsvp.listing.address}, {rsvp.listing.city}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{rsvp.slotDate ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {rsvp.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
