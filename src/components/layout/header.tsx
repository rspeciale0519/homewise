"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/data/navigation";
import { PHONE } from "@/lib/constants";
import { MobileNav } from "./mobile-nav";
import { AuthButtons } from "./auth-buttons";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMobileOpen(false);
      setOpenDropdown(null);
    });
  }, [pathname]);

  const handleMouseEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-500 ease-out",
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] border-b border-slate-200/60"
            : "bg-white border-b border-slate-100"
        )}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <div
            className={cn(
              "flex items-center justify-between gap-4 transition-all duration-500",
              scrolled ? "h-14 md:h-16" : "h-[72px] md:h-20"
            )}
          >

            {/* Logo */}
            <Link href="/" className="shrink-0 flex items-center" aria-label="Home Wise Realty Group — Home">
              <Image
                src="/images/logo.png"
                alt="Home Wise Realty Group"
                width={220}
                height={72}
                className={cn(
                  "w-auto transition-all duration-500",
                  scrolled ? "h-12 md:h-14" : "h-16 md:h-[72px]"
                )}
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden lg:flex items-center gap-0.5"
              ref={dropdownRef}
              aria-label="Main navigation"
            >
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => item.children && handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium tracking-wide transition-colors duration-200",
                      isActive(item.href)
                        ? "text-navy-600"
                        : "text-slate-600 hover:text-navy-600 hover:bg-slate-50"
                    )}
                  >
                    {item.label}
                    {item.children && (
                      <svg
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          openDropdown === item.label && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>

                  {/* Dropdown */}
                  {item.children && openDropdown === item.label && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 animate-slide-down"
                      onMouseEnter={() => handleMouseEnter(item.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 p-2 min-w-[240px]">
                        <div className="h-0.5 w-8 bg-crimson-600 rounded-full mx-3 mb-2" />
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block px-3 py-2.5 rounded-lg transition-colors duration-150 group",
                              pathname === child.href
                                ? "bg-navy-50 text-navy-700"
                                : "hover:bg-slate-50"
                            )}
                          >
                            <span className={cn(
                              "block text-sm font-medium transition-colors",
                              pathname === child.href
                                ? "text-navy-700"
                                : "text-slate-700 group-hover:text-navy-700"
                            )}>
                              {child.label}
                            </span>
                            {child.description && (
                              <span className="block text-xs text-slate-400 mt-0.5 group-hover:text-slate-500 transition-colors">
                                {child.description}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Side: Phone + CTA + Auth */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href={`tel:${PHONE.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-navy-700 transition-colors"
              >
                <svg className="h-4 w-4 text-crimson-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-medium">{PHONE}</span>
              </a>
              <Link
                href="/home-evaluation"
                className="inline-flex items-center px-4 py-2 rounded-md bg-crimson-600 text-white text-sm font-medium tracking-wide hover:bg-crimson-700 transition-colors duration-200 shadow-sm"
              >
                Free Home Evaluation
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <AuthButtons />
              <UserMenu />
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden flex items-center justify-center h-10 w-10 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
