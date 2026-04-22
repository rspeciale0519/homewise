"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useSupabase } from "@/components/providers/supabase-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useDashboardHref } from "@/lib/use-dashboard-href";

const STATIC_MENU_ITEMS = [
  { href: "/dashboard/favorites", label: "Favorites", icon: "heart" },
  { href: "/dashboard/saved-searches", label: "My Searches", icon: "search" },
  { href: "/dashboard/profile", label: "Profile", icon: "user" },
] as const;

export function UserMenu() {
  const { user, supabase, loading } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dashboardHref = useDashboardHref(!!user);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile?.role === "admin") setIsAdmin(true);
        if (data?.profile?.avatarUrl) setAvatarUrl(data.profile.avatarUrl);
      })
      .catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2"
          aria-label="User menu"
        >
          <UserAvatar
            avatarUrl={avatarUrl}
            firstName={user.user_metadata?.first_name ?? ""}
            lastName={user.user_metadata?.last_name ?? ""}
            size="sm"
          />
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

          <DropdownMenu.Item asChild>
            <Link
              href={dashboardHref}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700"
            >
              <MenuIcon type="grid" />
              Dashboard
            </Link>
          </DropdownMenu.Item>

          {STATIC_MENU_ITEMS.map((item) => (
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
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/profile#avatar"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Change Photo
            </Link>
          </DropdownMenu.Item>

          {isAdmin && (
            <>
              <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />
              <DropdownMenu.Label className="px-4 py-1.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Switch View</p>
              </DropdownMenu.Label>
              <DropdownMenu.Item asChild>
                <Link
                  href="/dashboard/agent-hub"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700"
                >
                  <MenuIcon type="agent" />
                  Agent
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700"
                >
                  <MenuIcon type="admin" />
                  Admin Panel
                </Link>
              </DropdownMenu.Item>
            </>
          )}

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
    case "agent":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      );
    case "admin":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}
