"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminSidebarIcon } from "./admin-sidebar-icons";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/admin/contacts", label: "Contacts", icon: "contact" },
      { href: "/admin/pipeline", label: "Pipeline", icon: "pipeline" },
      { href: "/admin/tags", label: "Tags", icon: "tag" },
      { href: "/admin/lead-routing", label: "Lead Routing", icon: "route" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", icon: "mail" },
      { href: "/admin/broadcasts", label: "Broadcasts", icon: "megaphone" },
      { href: "/admin/automations", label: "Automations", icon: "zap" },
      { href: "/admin/seo-content", label: "SEO Content", icon: "globe" },
    ],
  },
  {
    title: "Team",
    items: [
      { href: "/admin/agents", label: "Agents", icon: "agent" },
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/training", label: "Training Hub", icon: "book" },
      { href: "/admin/documents", label: "Document Library", icon: "document" },
      { href: "/admin/team-performance", label: "Performance", icon: "chart" },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/admin/billing", label: "Revenue", icon: "chart", exact: true },
      { href: "/admin/billing/agents", label: "Agent Billing", icon: "credit-card" },
      { href: "/admin/billing/products", label: "Plans & Add-ons", icon: "package" },
      { href: "/admin/billing/features", label: "Features", icon: "toggle" },
      { href: "/admin/billing/settings", label: "Billing Settings", icon: "gear" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/submissions", label: "Submissions", icon: "inbox" },
      { href: "/admin/alerts", label: "Property Alerts", icon: "bell" },
      { href: "/admin/sync", label: "MLS Sync", icon: "sync" },
      { href: "/admin/cma", label: "CMA Tool", icon: "document" },
      { href: "/admin/ai-usage", label: "AI Usage", icon: "sparkle" },
      { href: "/admin/jobs", label: "Background Jobs", icon: "jobs" },
      { href: "/admin/direct-mail", label: "Direct Mail", icon: "mail" },
      { href: "/admin/settings", label: "Settings", icon: "gear" },
    ],
  },
];

const ALL_NAV_ITEMS = ADMIN_SECTIONS.flatMap((s) => s.items);

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:border-r lg:border-slate-100 lg:bg-cream-50/50">
        <div className="flex-1 flex flex-col py-4 px-4 gap-0.5 overflow-y-auto">
          {ADMIN_SECTIONS.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive(item.href, item.exact)
                      ? "bg-white text-navy-700 shadow-sm border border-slate-100"
                      : "text-slate-600 hover:bg-white/60 hover:text-navy-700"
                  )}
                >
                  <AdminSidebarIcon type={item.icon} active={isActive(item.href, item.exact)} />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="px-4 py-4 border-t border-slate-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-navy-700 hover:bg-white/60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile horizontal tabs */}
      <nav className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-3 border-b border-slate-100 bg-white scrollbar-hide">
        {ALL_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              isActive(item.href, item.exact)
                ? "bg-crimson-600 text-white"
                : "text-slate-600 bg-slate-50 hover:bg-slate-100"
            )}
          >
            <AdminSidebarIcon type={item.icon} active={isActive(item.href, item.exact)} mobile />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
