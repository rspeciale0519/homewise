"use client";

import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";

export function AuthButtons() {
  const { user, loading } = useSupabase();

  if (loading || user) return null;

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm font-medium text-slate-600 hover:text-navy-700 transition-colors"
      >
        Log In
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center px-4 py-2 rounded-md border border-navy-600 text-navy-600 text-sm font-medium tracking-wide hover:bg-navy-600 hover:text-white transition-all duration-200"
      >
        Register
      </Link>
    </div>
  );
}
