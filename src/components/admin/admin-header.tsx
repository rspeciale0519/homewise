"use client";

import Link from "next/link";
import { UserMenu } from "@/components/layout/user-menu";

export function AdminHeader() {
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
          <Link href="/" className="hover:text-navy-700 transition-colors">
            Back to Site
          </Link>
        </div>
      </div>

      <UserMenu />
    </header>
  );
}
