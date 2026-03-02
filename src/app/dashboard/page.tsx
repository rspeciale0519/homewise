import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MortgageCalculator } from "@/components/shared/mortgage-calculator";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, favCount, searchCount] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: user.id } }),
    prisma.favoriteProperty.count({ where: { userId: user.id } }),
    prisma.savedSearch.count({ where: { userId: user.id } }),
  ]);

  const firstName = profile?.firstName || "there";

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Here&apos;s an overview of your real estate activity.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Favorites"
          value={favCount}
          href="/dashboard/favorites"
          icon={<HeartIcon />}
          accent="crimson"
        />
        <StatCard
          label="Saved Searches"
          value={searchCount}
          href="/dashboard/saved-searches"
          icon={<SearchIcon />}
          accent="navy"
        />
        <StatCard
          label="My Agent"
          value={profile?.preferredAgent ? "Connected" : "None"}
          href="/dashboard/agent"
          icon={<AgentIcon />}
          accent="gold"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            href="/properties"
            label="Browse Properties"
            description="Search listings across Central Florida"
          />
          <QuickAction
            href="/dashboard/profile"
            label="Edit Profile"
            description="Update your name, phone, and preferences"
          />
          <QuickAction
            href="/agents"
            label="Find an Agent"
            description="Connect with a Home Wise agent"
          />
          <QuickAction
            href="/property-updates"
            label="Property Alerts"
            description="Get notified about new listings"
          />
        </div>
      </div>

      {/* Mortgage calculator */}
      <div className="max-w-md">
        <MortgageCalculator />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: React.ReactNode;
  accent: "crimson" | "navy" | "gold";
}) {
  const bgMap = {
    crimson: "bg-crimson-50 text-crimson-600",
    navy: "bg-navy-50 text-navy-600",
    gold: "bg-amber-50 text-amber-600",
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${bgMap[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-navy-700">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-navy-200 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy-700 group-hover:text-crimson-600 transition-colors">
          {label}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
