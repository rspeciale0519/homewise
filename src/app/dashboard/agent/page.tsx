import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AgentConnection } from "./agent-connection";

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    include: { agent: true },
  });

  if (!profile) redirect("/dashboard");

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-display-sm text-navy-700">My Agent</h1>
        <p className="mt-2 text-sm text-slate-500">
          {profile.agent ? "Your connected agent" : "Connect with a Home Wise agent"}
        </p>
      </div>

      {profile.agent ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-navy-600 text-white font-serif text-xl font-bold flex items-center justify-center shrink-0">
              {profile.agent.firstName.charAt(0)}{profile.agent.lastName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-lg font-semibold text-navy-700">
                {profile.agent.firstName} {profile.agent.lastName}
              </h3>
              {profile.agent.designations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.agent.designations.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase text-navy-500 bg-navy-50 rounded-md"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {profile.agent.phone && (
                <a
                  href={`tel:${profile.agent.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-1.5 mt-3 text-sm text-slate-500 hover:text-navy-700 transition-colors"
                >
                  <svg className="h-3.5 w-3.5 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {profile.agent.phone}
                </a>
              )}
              {profile.agent.email && (
                <a
                  href={`mailto:${profile.agent.email}`}
                  className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 hover:text-navy-700 transition-colors"
                >
                  <svg className="h-3.5 w-3.5 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profile.agent.email}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
            <Link
              href={`/agents/${profile.agent.slug}`}
              className="px-4 py-2 rounded-lg bg-navy-50 text-sm font-medium text-navy-600 hover:bg-navy-100 transition-colors"
            >
              View Full Profile
            </Link>
            <AgentConnection currentAgentId={profile.agent.id} />
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h2 className="font-serif text-lg font-semibold text-navy-700 mb-2">No agent connected</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Browse our agent directory to find and connect with a Home Wise agent.
          </p>
          <Link
            href="/agents"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors shadow-sm"
          >
            Browse Agents
          </Link>
        </div>
      )}
    </div>
  );
}
