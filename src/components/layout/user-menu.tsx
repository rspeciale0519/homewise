"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useSupabase } from "@/components/providers/supabase-provider";

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/dashboard/favorites", label: "Favorites", icon: "heart" },
  { href: "/dashboard/saved-searches", label: "My Searches", icon: "search" },
  { href: "/dashboard/profile", label: "Profile", icon: "user" },
] as const;

export function UserMenu() {
  const { user, supabase, loading } = useSupabase();
  const router = useRouter();

  if (loading || !user) return null;

  const initials = getInitials(user.user_metadata?.first_name, user.user_metadata?.last_name, user.email);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2"
          aria-label="User menu"
        >
          <span className="h-9 w-9 rounded-full bg-navy-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
            {initials}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 duration-200"
        >
          <DropdownMenu.Label className="px-4 py-2 border-b border-slate-100 mb-1">
            <p className="text-sm font-medium text-navy-700 truncate">
              {user.user_metadata?.first_name} {user.user_metadata?.last_name}
            </p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </DropdownMenu.Label>

          {MENU_ITEMS.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700"
              >
                <MenuIcon type={item.icon} />
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-crimson-50 data-[highlighted]:text-crimson-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign Out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function getInitials(first?: string, last?: string, email?: string): string {
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (first) return first.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "U";
}

function MenuIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 text-slate-400";
  switch (type) {
    case "grid":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case "heart":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      );
    case "search":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    case "user":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      );
    default:
      return null;
  }
}
