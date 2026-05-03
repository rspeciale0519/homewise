import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { SITE_NAME } from "@/lib/constants";
import { orderSubmitSchema } from "@/lib/direct-mail/schemas";
import {
  type MailClass,
  type ProductType,
  type Workflow,
} from "@/lib/direct-mail/constants";
import {
  downloadObject,
  filteredListFileKeyFor,
  uploadAtKey,
  uploadOrderFile,
} from "@/lib/direct-mail/storage";
import { filterCsvColumns } from "@/lib/direct-mail/csv-validator";
import { OrderSummaryPdf } from "@/lib/direct-mail/order-summary-pdf";
import type { ReturnAddress } from "@/lib/direct-mail/schemas";
import type { ListFile } from "@/lib/direct-mail/types";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, firstName: true, lastName: true, email: true, phone: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.mailOrder.findUnique({ where: { id } });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Order is already submitted" }, { status: 409 });
  }

  const candidate = {
    workflow: order.workflow,
    subjectPropertyAddress: order.subjectPropertyAddress,
    campaignName: order.campaignName,
    productType: order.productType,
    productSize: order.productSize,
    mailClass: order.mailClass,
    dropDate: order.dropDate ? toIsoDate(order.dropDate) : null,
    returnAddress: order.returnAddress,
    quantity: order.quantity,
    specialInstructions: order.specialInstructions,
    artworkFiles: order.artworkFiles,
    listFiles: order.listFiles,
    complianceConfirmed: order.complianceConfirmed,
  };

  const parsed = orderSubmitSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Order is incomplete", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Generate filtered CSV copies for any list with excluded columns.
  // Original files are preserved so the agent's master list isn't mutated.
  const finalLists: ListFile[] = [];
  for (const list of parsed.data.listFiles) {
    if (list.excludedColumns.length === 0) {
      finalLists.push(list);
      continue;
    }
    try {
      const original = await downloadObject(list.fileKey);
      const filteredText = filterCsvColumns(
        original.buffer.toString("utf-8"),
        list.excludedColumns,
      );
      const filteredKey = filteredListFileKeyFor(order.id, list.id);
      await uploadAtKey(filteredKey, {
        buffer: Buffer.from(filteredText, "utf-8"),
        mimeType: "text/csv",
        ext: "csv",
      });
      finalLists.push({ ...list, fileKey: filteredKey });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      return NextResponse.json(
        { error: `Failed to filter list "${list.name}": ${msg}` },
        { status: 500 },
      );
    }
  }

  const submittedAt = new Date();
  const agentName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email;
  const totalRecipients = finalLists.reduce((sum, l) => sum + l.rowCount, 0);

  const pdfBuffer = await renderToBuffer(
    createElement(OrderSummaryPdf, {
      orderRef: order.id,
      submittedAt,
      agent: {
        name: agentName,
        email: profile.email,
        phone: profile.phone,
        brokerage: SITE_NAME,
      },
      workflow: order.workflow as Workflow,
      subjectPropertyAddress: order.subjectPropertyAddress,
      campaignName: order.campaignName,
      productType: order.productType as ProductType,
      productSize: order.productSize ?? "",
      mailClass: order.mailClass as MailClass,
      dropDate: parsed.data.dropDate,
      quantity: order.quantity || totalRecipients,
      returnAddress: order.returnAddress as unknown as ReturnAddress,
      specialInstructions: order.specialInstructions,
      artworkFiles: parsed.data.artworkFiles,
      listFiles: finalLists,
      // listFiles already encodes original list metadata + filtered fileKey.
      // Original list ids/names retained for the PDF.
      originalLists: parsed.data.listFiles,
    }) as ReactElement<DocumentProps>,
  );

  const summaryKey = await uploadOrderFile(order.id, "summary", {
    buffer: Buffer.from(pdfBuffer),
    mimeType: "application/pdf",
    ext: "pdf",
  });

  const updated = await prisma.mailOrder.update({
    where: { id: order.id },
    data: {
      status: "submitted",
      submittedAt,
      emailStatus: "pending",
      summaryPdfKey: summaryKey,
      // Persist the filtered keys so dispatch + downloads use the filtered files.
      listFiles: finalLists as unknown as object,
      quantity: order.quantity || totalRecipients,
    },
    select: { id: true, submittedAt: true },
  });

  await inngest.send({
    name: "direct-mail/order.submitted",
    data: { orderId: order.id },
  });

  return NextResponse.json({ order: updated });
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
