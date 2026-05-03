import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ADDRESS, SITE_NAME } from "@/lib/constants";
import {
  ARTWORK_INITIAL_ROWS,
  workflowFromSlug,
  workflowLabel,
} from "@/lib/direct-mail/constants";
import type { ArtworkFile, ArtworkRow, DraftState } from "@/lib/direct-mail/types";
import { YlsPill } from "../_components/yls-pill";
import { Wizard } from "./_components/wizard";

function nanoLikeId(): string {
  return Math.random().toString(36).slice(2, 14);
}

function artworkRowsFromFiles(files: unknown): ArtworkRow[] {
  const arr = Array.isArray(files) ? (files as ArtworkFile[]) : [];
  const rows: ArtworkRow[] = arr.map((f) => ({
    id: f.id,
    name: f.name,
    upload: {
      fileKey: f.fileKey,
      fileName: f.fileName,
      byteSize: f.byteSize,
      mimeType: f.mimeType,
      warnings: f.warnings ?? [],
    },
  }));
  while (rows.length < ARTWORK_INITIAL_ROWS) {
    rows.push({ id: nanoLikeId(), name: "", upload: null });
  }
  return rows;
}

const DEFAULT_RETURN_ADDRESS = {
  name: SITE_NAME,
  address1: ADDRESS.street,
  address2: null,
  city: ADDRESS.city,
  state: ADDRESS.state,
  zip: ADDRESS.zip,
};

export default async function NewMailOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ workflow?: string; draftId?: string }>;
}) {
  const params = await searchParams;
  const workflow = workflowFromSlug(params.workflow);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/direct-mail");

  let initialDraft: DraftState | null = null;
  if (params.draftId) {
    const order = await prisma.mailOrder.findUnique({
      where: { id: params.draftId },
      select: {
        id: true,
        userId: true,
        status: true,
        currentStep: true,
        workflow: true,
        subjectPropertyAddress: true,
        campaignName: true,
        productType: true,
        productSize: true,
        mailClass: true,
        dropDate: true,
        returnAddress: true,
        quantity: true,
        listRowCount: true,
        specialInstructions: true,
        artworkFiles: true,
        listFileKey: true,
        complianceConfirmed: true,
      },
    });
    if (!order || order.userId !== user.id) notFound();
    if (order.status !== "draft") {
      redirect(`/dashboard/direct-mail/orders/${order.id}`);
    }
    initialDraft = {
      id: order.id,
      currentStep: order.currentStep,
      workflow: workflowFromSlug(order.workflow),
      subjectPropertyAddress: order.subjectPropertyAddress,
      campaignName: order.campaignName,
      productType: (order.productType as DraftState["productType"]) ?? null,
      productSize: order.productSize,
      mailClass: (order.mailClass as DraftState["mailClass"]) ?? null,
      dropDate: order.dropDate ? toIsoDate(order.dropDate) : null,
      returnAddress:
        (order.returnAddress as DraftState["returnAddress"]) ?? DEFAULT_RETURN_ADDRESS,
      quantity: order.quantity,
      listRowCount: order.listRowCount,
      specialInstructions: order.specialInstructions,
      artworkRows: artworkRowsFromFiles(order.artworkFiles),
      listFileKey: order.listFileKey,
      complianceConfirmed: order.complianceConfirmed,
    };
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href="/dashboard/direct-mail"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson-600 mb-2"
          >
            ← Direct Mail
          </Link>
          <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
            New {workflowLabel(initialDraft?.workflow ?? workflow)}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Five quick steps. Save and exit at any time — drafts are kept on your account.
          </p>
        </div>
        <YlsPill />
      </div>

      <Wizard
        initialWorkflow={workflow}
        initialDraft={initialDraft}
        defaultReturnAddress={DEFAULT_RETURN_ADDRESS}
      />
    </div>
  );
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
