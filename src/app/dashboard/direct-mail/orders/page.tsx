import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YlsPill } from "../_components/yls-pill";
import { OrderListView } from "./_components/order-list-view";

export default async function MailOrdersListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/direct-mail/orders");

  const [submittedRows, draftRows] = await Promise.all([
    prisma.mailOrder.findMany({
      where: { userId: user.id, status: "submitted" },
      orderBy: { submittedAt: "desc" },
      take: 25,
      select: {
        id: true,
        workflow: true,
        productType: true,
        productSize: true,
        listFiles: true,
        dropDate: true,
        submittedAt: true,
        emailStatus: true,
      },
    }),
    prisma.mailOrder.findMany({
      where: { userId: user.id, status: "draft" },
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        workflow: true,
        currentStep: true,
        updatedAt: true,
      },
    }),
  ]);

  const submitted = submittedRows.map((r) => {
    const lists = Array.isArray(r.listFiles)
      ? (r.listFiles as Array<{ rowCount?: number }>)
      : [];
    const totalRecipients = lists.reduce((sum, l) => sum + (l.rowCount ?? 0), 0);
    return {
      id: r.id,
      workflow: r.workflow,
      productType: r.productType,
      productSize: r.productSize,
      totalRecipients,
      dropDate: r.dropDate ? r.dropDate.toISOString() : null,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      emailStatus: r.emailStatus,
    };
  });

  const drafts = draftRows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href="/dashboard/direct-mail"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson-600 mb-2"
          >
            ← Direct Mail
          </Link>
          <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
            My mail orders
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            All your direct-mail orders — submitted and in-progress.
          </p>
        </div>
        <YlsPill />
      </div>

      <OrderListView submitted={submitted} drafts={drafts} />
    </div>
  );
}
