"use client";

import Link from "next/link";
import { UserMenu } from "@/components/layout/user-menu";

export function DashboardHeader() {
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

      {/* Right: User menu */}
      <UserMenu />
    </header>
  );
}
