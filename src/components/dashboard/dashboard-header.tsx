"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";

export function DashboardHeader() {
  const { user, supabase } = useSupabase();
  const router = useRouter();

  const firstName = user?.user_metadata?.first_name as string | undefined;
  const lastName = user?.user_metadata?.last_name as string | undefined;
  const initials = `${(firstName ?? "U").charAt(0)}${(lastName ?? "").charAt(0)}`.toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      {/* Left: Logo / Back link */}
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-700 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="hidden sm:inline">Home Wise</span>
      </Link>

      {/* Right: User info */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-navy-700">
            {firstName} {lastName}
          </p>
          <p className="text-xs text-slate-400">{user?.email}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-navy-600 text-white text-xs font-bold flex items-center justify-center">
          {initials}
        </div>
        <button
          onClick={handleSignOut}
          className="ml-1 p-2 rounded-lg text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 transition-colors"
          aria-label="Sign out"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
