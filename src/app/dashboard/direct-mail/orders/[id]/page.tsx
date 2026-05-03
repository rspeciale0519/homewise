import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YlsPill } from "../../_components/yls-pill";
import { YlsFulfillmentFooter } from "../../_components/yls-fulfillment-footer";

export default async function MailOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just_submitted?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justSubmitted = sp.just_submitted === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/direct-mail/orders/${id}`);

  const order = await prisma.mailOrder.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      workflow: true,
      productType: true,
      productSize: true,
      submittedAt: true,
      createdAt: true,
      emailStatus: true,
      listRowCount: true,
      dropDate: true,
    },
  });

  if (!order || order.userId !== user.id) {
    notFound();
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href="/dashboard/direct-mail/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson-600 mb-2"
          >
            ← My mail orders
          </Link>
          <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
            Order {(order.submittedAt ?? order.createdAt).toLocaleString()}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Status: {order.status} · Email: {order.emailStatus}
          </p>
        </div>
        <YlsPill />
      </div>

      {justSubmitted && order.status === "submitted" && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              ✓
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-emerald-900">
                Order received — your YLS rep will email proofs within 1 business day.
              </p>
              <p className="mt-1 text-sm text-emerald-800/80">
                Watch for an email from <span className="font-medium">yellowlettershop.com</span>.
                Check your spam folder if you don&apos;t see it. The proofs and invoice will
                come straight to your email.
              </p>
            </div>
          </div>
        </div>
      )}

      {justSubmitted && (
        <div className="mb-6">
          <YlsFulfillmentFooter />
        </div>
      )}

      <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
        <p className="text-sm text-slate-500">
          The full read-only detail view (summary, action bar, signed-URL thumbnails) ships in Phase 5.
        </p>
      </div>
    </div>
  );
}
