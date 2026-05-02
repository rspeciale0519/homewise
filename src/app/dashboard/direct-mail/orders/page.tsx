import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YlsPill } from "../_components/yls-pill";

export default async function MailOrdersListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/direct-mail/orders");

  const [submitted, drafts] = await Promise.all([
    prisma.mailOrder.findMany({
      where: { userId: user.id, status: "submitted" },
      orderBy: { submittedAt: "desc" },
      take: 25,
      select: {
        id: true,
        workflow: true,
        productType: true,
        productSize: true,
        listRowCount: true,
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

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
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
            {submitted.length} submitted · {drafts.length} draft{drafts.length === 1 ? "" : "s"}
          </p>
        </div>
        <YlsPill />
      </div>

      <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
        <p className="text-sm text-slate-500">
          The full list view (with tabs, status pills, and pagination) ships in Phase 5.
        </p>
      </div>
    </div>
  );
}
