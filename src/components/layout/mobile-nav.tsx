"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { NAV_ITEMS } from "@/data/navigation";
import { PHONE, EMAIL } from "@/lib/constants";
import { SocialLinks } from "@/components/shared/social-links";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useDashboardHref } from "@/lib/use-dashboard-href";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const pathname = usePathname();
  const { user, supabase, loading } = useSupabase();
  const dashboardHref = useDashboardHref(!!user);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      requestAnimationFrame(() => setExpandedItem(null));
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
        <Dialog.Content className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col outline-none lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-300 ease-out">
          <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <Image
              src="/images/logo.png"
              alt="Home Wise Realty Group"
              width={160}
              height={54}
              className="h-10 w-auto"
            />
            <Dialog.Close asChild>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="mb-1">
                {item.children ? (
                  <>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        pathname.startsWith(item.href)
                          ? "text-navy-700 bg-navy-50"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() =>
                        setExpandedItem(expandedItem === item.label ? null : item.label)
                      }
                      aria-expanded={expandedItem === item.label}
                    >
                      <span>{item.label}</span>
                      <svg
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform duration-200",
                          expandedItem === item.label && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Sub-items */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-200",
                        expandedItem === item.label ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="ml-3 mt-1 pl-3 border-l-2 border-crimson-200 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block px-3 py-2.5 rounded-lg text-sm transition-colors",
                              pathname === child.href
                                ? "text-navy-700 font-medium bg-navy-50"
                                : "text-slate-600 hover:text-navy-700 hover:bg-slate-50"
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "block px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "text-navy-700 bg-navy-50"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-5 border-t border-slate-100 space-y-4 bg-cream-50">
            {/* Auth section */}
            {!loading && (
              user ? (
                <div className="space-y-3 pb-3 border-b border-slate-200/60">
                  <p className="text-sm font-medium text-navy-700">
                    Hi, {user.user_metadata?.first_name || "there"}
                  </p>
                  <Link
                    href={dashboardHref}
                    className="flex items-center justify-center w-full h-11 rounded-md bg-navy-600 text-white text-sm font-medium tracking-wide hover:bg-navy-700 transition-colors"
                  >
                    My Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      onClose();
                      await supabase.auth.signOut();
                      window.location.href = "/";
                    }}
                    className="flex items-center justify-center w-full h-10 rounded-md border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white hover:text-crimson-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pb-3 border-b border-slate-200/60">
                  <Link
                    href="/login"
                    className="flex-1 flex items-center justify-center h-11 rounded-md border border-navy-600 text-navy-600 text-sm font-medium tracking-wide hover:bg-navy-600 hover:text-white transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 flex items-center justify-center h-11 rounded-md bg-navy-600 text-white text-sm font-medium tracking-wide hover:bg-navy-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )
            )}

            <Link
              href="/home-evaluation"
              className="flex items-center justify-center w-full h-11 rounded-md bg-crimson-600 text-white text-sm font-medium tracking-wide hover:bg-crimson-700 transition-colors"
            >
              Free Home Evaluation
            </Link>
            <div className="flex flex-col gap-2">
              <a
                href={`tel:${PHONE.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-navy-700 transition-colors"
              >
                <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {PHONE}
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-navy-700 transition-colors"
              >
                <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {EMAIL}
              </a>
            </div>
            <SocialLinks size="sm" className="pt-2" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
