import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YlsPill } from "../../_components/yls-pill";

export default async function MailOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      submittedAt: true,
      createdAt: true,
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
            Order detail
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Status: {order.status} · {(order.submittedAt ?? order.createdAt).toString()}
          </p>
        </div>
        <YlsPill />
      </div>

      <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
        <p className="text-sm text-slate-500">
          The full read-only detail view (summary, action bar, signed-URL thumbnails) ships in Phase 5.
        </p>
      </div>
    </div>
  );
}
