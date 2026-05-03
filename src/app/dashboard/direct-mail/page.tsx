import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YlsPill } from "./_components/yls-pill";

const WORKFLOW_TILES: Array<{
  slug: string;
  title: string;
  description: string;
  icon: "sold" | "listed" | "farm" | "browse";
}> = [
  {
    slug: "just-sold",
    title: "Just Sold",
    description: "Announce a recent close to the surrounding neighborhood.",
    icon: "sold",
  },
  {
    slug: "just-listed",
    title: "Just Listed",
    description: "Promote a brand-new listing to nearby prospects.",
    icon: "listed",
  },
  {
    slug: "farm",
    title: "Farm Campaign",
    description: "Recurring outreach to a neighborhood you're farming.",
    icon: "farm",
  },
  {
    slug: "browse",
    title: "Browse all products",
    description: "Custom postcard, letter, snap pack, EDDM, or door hanger.",
    icon: "browse",
  },
];

export default async function DirectMailHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/direct-mail");

  const [recentSubmitted, draftCount] = await Promise.all([
    prisma.mailOrder.findMany({
      where: { userId: user.id, status: "submitted" },
      orderBy: { submittedAt: "desc" },
      take: 3,
      select: {
        id: true,
        workflow: true,
        productType: true,
        productSize: true,
        listFiles: true,
        submittedAt: true,
        emailStatus: true,
      },
    }),
    prisma.mailOrder.count({
      where: { userId: user.id, status: "draft" },
    }),
  ]);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-crimson-600 mb-2">
            Agent Tools
          </p>
          <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
            Direct Mail
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Send postcards, letters, and farm campaigns to your prospects.
          </p>
        </div>
        <YlsPill />
      </div>

      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORKFLOW_TILES.map((tile) => (
            <Link
              key={tile.slug}
              href={`/dashboard/direct-mail/new?workflow=${tile.slug}`}
              className="group relative p-5 rounded-2xl bg-white border border-slate-100 hover:border-crimson-200 hover:shadow-card transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-crimson-600 to-navy-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-11 w-11 rounded-xl bg-navy-50 group-hover:bg-crimson-50 flex items-center justify-center mb-3 transition-colors">
                <WorkflowIcon icon={tile.icon} />
              </div>
              <h3 className="font-serif text-base font-semibold text-navy-700 group-hover:text-crimson-700 transition-colors mb-1">
                {tile.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tile.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold text-navy-700">
            Recent orders
          </h2>
          <Link
            href="/dashboard/direct-mail/orders"
            className="text-xs font-semibold text-crimson-600 hover:text-crimson-700"
          >
            View all
            {draftCount > 0 ? ` · ${draftCount} draft${draftCount === 1 ? "" : "s"}` : ""} →
          </Link>
        </div>

        {recentSubmitted.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">
              You haven&apos;t submitted any direct-mail orders yet.
            </p>
            <Link
              href="/dashboard/direct-mail/new?workflow=browse"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-crimson-600 hover:text-crimson-700"
            >
              Start a campaign →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {recentSubmitted.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/dashboard/direct-mail/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-xl bg-white border border-slate-100 p-4 hover:border-crimson-200 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-700 truncate">
                      {workflowLabel(order.workflow)}
                      {order.productType ? ` · ${productLabel(order.productType, order.productSize)}` : ""}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.submittedAt ? formatStamp(order.submittedAt) : "—"}
                      {" · "}
                      {totalListRecipients(order.listFiles).toLocaleString()} recipient{totalListRecipients(order.listFiles) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusPill emailStatus={order.emailStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function totalListRecipients(listFiles: unknown): number {
  if (!Array.isArray(listFiles)) return 0;
  return (listFiles as Array<{ rowCount?: number }>).reduce(
    (sum, l) => sum + (l.rowCount ?? 0),
    0,
  );
}

function workflowLabel(slug: string): string {
  switch (slug) {
    case "just_sold":
    case "just-sold":
      return "Just Sold campaign";
    case "just_listed":
    case "just-listed":
      return "Just Listed campaign";
    case "farm":
      return "Farm campaign";
    case "browse":
      return "Custom order";
    default:
      return slug;
  }
}

function productLabel(productType: string, productSize: string | null): string {
  const type = productType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return productSize ? `${type} ${productSize}` : type;
}

function formatStamp(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

function StatusPill({ emailStatus }: { emailStatus: string }) {
  const fallback = { label: "Submitted", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  const map: Record<string, { label: string; classes: string }> = {
    sent: fallback,
    pending: { label: "Sending…", classes: "bg-slate-100 text-slate-600 border-slate-200" },
    failed: { label: "Awaiting send", classes: "bg-amber-50 text-amber-700 border-amber-200" },
    none: fallback,
  };
  const cfg = map[emailStatus] ?? fallback;
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

function WorkflowIcon({ icon }: { icon: "sold" | "listed" | "farm" | "browse" }) {
  const className = "h-5 w-5 text-navy-400 group-hover:text-crimson-600 transition-colors";
  switch (icon) {
    case "sold":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "listed":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l2 2 4-4m1.5-7.5l-3 3-3-3" />
        </svg>
      );
    case "farm":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      );
    case "browse":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
  }
}
