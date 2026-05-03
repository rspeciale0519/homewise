import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { workflowLabel, type Workflow } from "@/lib/direct-mail/constants";
import { AdminRetryButton } from "./_components/admin-retry-button";

export const metadata: Metadata = { title: "Direct Mail — Admin" };

export default async function AdminDirectMailPage() {
  await requireAdmin();

  const [pending, failed, recentSubmitted] = await Promise.all([
    prisma.mailOrder.findMany({
      where: { status: "submitted", emailStatus: "pending" },
      orderBy: { submittedAt: "desc" },
      take: 25,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.mailOrder.findMany({
      where: { status: "submitted", emailStatus: "failed" },
      orderBy: { lastDispatchedAt: "desc" },
      take: 25,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        dispatchLogs: {
          orderBy: { attemptedAt: "desc" },
          take: 1,
          select: { errorMessage: true, attemptedAt: true },
        },
      },
    }),
    prisma.mailOrder.findMany({
      where: { status: "submitted", emailStatus: "sent" },
      orderBy: { submittedAt: "desc" },
      take: 10,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Direct Mail</h1>
      <p className="text-slate-500 text-sm mb-8">
        Monitor outbound order emails to YellowLetterShop. Retry failed
        dispatches manually here.
      </p>

      <Section title={`Failed dispatches (${failed.length})`} accent="crimson">
        {failed.length === 0 ? (
          <EmptyState>No failed dispatches. All clear.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {failed.map((o) => (
              <li
                key={o.id}
                className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-700">
                    {workflowLabel(o.workflow as Workflow)} ·{" "}
                    {o.user
                      ? `${o.user.firstName} ${o.user.lastName} <${o.user.email}>`
                      : "(agent unknown)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submitted {fmt(o.submittedAt)} ·{" "}
                    Last attempt {fmt(o.lastDispatchedAt)} ·{" "}
                    {o.dispatchAttempts} attempt
                    {o.dispatchAttempts === 1 ? "" : "s"}
                  </p>
                  {o.dispatchLogs[0]?.errorMessage && (
                    <p className="text-xs text-crimson-700 mt-1 font-mono break-all">
                      {o.dispatchLogs[0].errorMessage}
                    </p>
                  )}
                </div>
                <AdminRetryButton orderId={o.id} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Sending now (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyState>No orders currently in flight.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {pending.map((o) => (
              <li
                key={o.id}
                className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-700">
                    {workflowLabel(o.workflow as Workflow)} ·{" "}
                    {o.user
                      ? `${o.user.firstName} ${o.user.lastName}`
                      : "(agent unknown)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submitted {fmt(o.submittedAt)}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Sending…
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recently sent (last 10)">
        {recentSubmitted.length === 0 ? (
          <EmptyState>No completed dispatches yet.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {recentSubmitted.map((o) => (
              <li
                key={o.id}
                className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-700">
                    {workflowLabel(o.workflow as Workflow)} ·{" "}
                    {o.user
                      ? `${o.user.firstName} ${o.user.lastName}`
                      : "(agent unknown)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sent {fmt(o.lastDispatchedAt ?? o.submittedAt)} ·{" "}
                    {o.listRowCount.toLocaleString()} recipients
                  </p>
                </div>
                <Link
                  href={`/dashboard/direct-mail/orders/${o.id}`}
                  className="shrink-0 text-xs font-semibold text-navy-600 hover:text-crimson-700"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: "crimson";
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2
        className={`font-serif text-lg font-semibold mb-4 ${
          accent === "crimson" ? "text-crimson-700" : "text-navy-700"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}
