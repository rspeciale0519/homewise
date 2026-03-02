"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";

export function AdminHeader() {
  const { user, supabase } = useSupabase();
  const router = useRouter();

  const firstName = user?.user_metadata?.first_name as string | undefined;
  const lastName = user?.user_metadata?.last_name as string | undefined;
  const initials = `${(firstName ?? "A").charAt(0)}${(lastName ?? "").charAt(0)}`.toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-crimson-50 text-crimson-700 text-xs font-semibold uppercase tracking-wide">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Admin
        </span>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/dashboard"
            className="hover:text-navy-700 transition-colors"
          >
            Dashboard
          </Link>
          <span>&middot;</span>
          <Link href="/" className="hover:text-navy-700 transition-colors">
            Back to Site
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-navy-700">
            {firstName} {lastName}
          </p>
          <p className="text-xs text-slate-400">{user?.email}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-crimson-600 text-white text-xs font-bold flex items-center justify-center">
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
