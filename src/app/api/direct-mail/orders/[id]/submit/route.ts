import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { SITE_NAME } from "@/lib/constants";
import { logApiError } from "@/lib/api-error";
import {
  SHOULD_DISPATCH_INLINE,
  dispatchMailOrderOnce,
} from "@/lib/direct-mail/dispatch";
import { orderSubmitSchema } from "@/lib/direct-mail/schemas";
import {
  MAX_ARTWORK_BYTES,
  MAX_LIST_BYTES,
  MAX_LIST_ROWS,
  MAX_ORDER_UPLOAD_BYTES,
  type MailClass,
  type ProductType,
  type Workflow,
} from "@/lib/direct-mail/constants";
import {
  DirectMailFileValidationError,
  artworkContentError,
  artworkFileKeyFor,
  decodeCsvBuffer,
  deleteObjects,
  downloadObjectWithinLimit,
  extFromFileName,
  extFromMime,
  listFileKeyFor,
  parseArtworkUploadAttemptKey,
  parseListUploadAttemptKey,
  submittedFileKeyFor,
  submittedPrefixFor,
  uploadCreateOnlyAtKey,
} from "@/lib/direct-mail/storage";
import {
  filterCsvColumns,
  parseListPreview,
  sanitizeCsvForSpreadsheet,
} from "@/lib/direct-mail/csv-validator";
import { inspectArtwork } from "@/lib/direct-mail/artwork-validator";
import { OrderSummaryPdf } from "@/lib/direct-mail/order-summary-pdf";
import { buildOrderBundle } from "@/lib/direct-mail/bundle";
import type { ReturnAddress } from "@/lib/direct-mail/schemas";
import type { ArtworkFile, ListFile } from "@/lib/direct-mail/types";

export const maxDuration = 60;
const SUBMISSION_LEASE_MS = 15 * 60 * 1000;

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
  const staleBefore = new Date(Date.now() - SUBMISSION_LEASE_MS);
  const isRecoverableSubmission =
    order.status === "submitting" && order.updatedAt < staleBefore;
  if (order.status !== "draft" && !isRecoverableSubmission) {
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

  const declaredUploadBytes = [
    ...parsed.data.artworkFiles,
    ...parsed.data.listFiles,
  ].reduce((sum, file) => sum + file.byteSize, 0);
  if (declaredUploadBytes > MAX_ORDER_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "The order files exceed the 100 MB total limit." },
      { status: 413 },
    );
  }

  const processingClaim = await prisma.mailOrder.updateMany({
    where: {
      id: order.id,
      OR: [
        { status: "draft" },
        { status: "submitting", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "submitting" },
  });
  if (processingClaim.count !== 1) {
    return NextResponse.json({ error: "Order is already being submitted" }, { status: 409 });
  }

  const releaseProcessingClaim = () => prisma.mailOrder.updateMany({
    where: { id: order.id, status: "submitting" },
    data: { status: "draft" },
  });

  const submittedPrefix = submittedPrefixFor(order.id);
  const submittedAt = new Date();
  const sealedKeys: string[] = [];
  const rollbackProcessingAttempt = async () => {
    try {
      await deleteObjects(sealedKeys);
    } catch (error) {
      logApiError("direct-mail/submit-cleanup", error);
    }
    try {
      await releaseProcessingClaim();
    } catch (error) {
      logApiError("direct-mail/submit-release", error);
    }
  };

  try {
  const finalArtwork: ArtworkFile[] = [];
  for (const artwork of parsed.data.artworkFiles) {
    try {
      const sealedArtwork = await sealArtworkFile({
          orderId: order.id,
          submittedPrefix,
          productSize: order.productSize,
          artwork,
        });
      finalArtwork.push(sealedArtwork);
      sealedKeys.push(sealedArtwork.fileKey);
    } catch (e) {
      await rollbackProcessingAttempt();
      return fileFailureResponse(`artwork "${artwork.name}"`, e);
    }
  }

  const finalLists: ListFile[] = [];
  for (const list of parsed.data.listFiles) {
    try {
      const sealedList = await sealListFile({
          orderId: order.id,
          submittedPrefix,
          list,
        });
      finalLists.push(sealedList);
      sealedKeys.push(sealedList.fileKey);
    } catch (e) {
      await rollbackProcessingAttempt();
      return fileFailureResponse(`mailing list "${list.name}"`, e);
    }
  }

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
      quantity: totalRecipients,
      returnAddress: order.returnAddress as unknown as ReturnAddress,
      specialInstructions: order.specialInstructions,
      artworkFiles: finalArtwork,
      listFiles: finalLists,
      // listFiles already encodes original list metadata + filtered fileKey.
      // Original list ids/names retained for the PDF.
      originalLists: parsed.data.listFiles,
    }) as ReactElement<DocumentProps>,
  );

  const summaryKey = submittedFileKeyFor(
    submittedPrefix,
    "summary",
    "report",
    "pdf",
  );
  await uploadCreateOnlyAtKey(summaryKey, {
    buffer: Buffer.from(pdfBuffer),
    mimeType: "application/pdf",
  });
  sealedKeys.push(summaryKey);

  const claim = await prisma.mailOrder.updateMany({
    where: { id: order.id, status: "submitting" },
    data: {
      status: "submitted",
      submittedAt,
      emailStatus: "pending",
      summaryPdfKey: summaryKey,
      artworkFiles: finalArtwork as unknown as object,
      listFiles: finalLists as unknown as object,
      quantity: totalRecipients,
    },
  });

  if (claim.count !== 1) {
    await rollbackProcessingAttempt();
    return NextResponse.json({ error: "Order is already submitted" }, { status: 409 });
  }

  // Build the "Download all order files" ZIP only after the submitted state
  // commits. Dispatch can rebuild it when this non-blocking step fails.
  try {
    await buildOrderBundle({
      orderId: order.id,
      summaryPdfKey: summaryKey,
      artworkFiles: finalArtwork,
      listFiles: finalLists.map((list) => ({
        name: list.name,
        fileKey: list.fileKey,
        fileName: list.fileName,
      })),
    });
  } catch (error) {
    logApiError("direct-mail/bundle-build", error);
  }
  } catch (error) {
    await rollbackProcessingAttempt();
    logApiError("direct-mail/submit", error);
    return NextResponse.json(
      { error: "Failed to submit the order" },
      { status: 502 },
    );
  }

  const updated = { id: order.id, submittedAt };

  try {
    if (SHOULD_DISPATCH_INLINE) {
      // Local dev: skip Inngest cloud (which can't reach localhost) and run
      // dispatch synchronously inside this request.
      await dispatchMailOrderOnce(order.id, "auto");
    } else {
      try {
      await inngest.send({
        id: `direct-mail-order-${order.id}`,
        name: "direct-mail/order.submitted",
        data: { orderId: order.id },
      });
      } catch (error) {
        logApiError("direct-mail/enqueue", error);
        await dispatchMailOrderOnce(order.id, "auto");
      }
    }
  } catch (error) {
    logApiError("direct-mail/dispatch-after-submit", error);
  }

  return NextResponse.json({ order: updated });
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function sealArtworkFile(input: {
  orderId: string;
  submittedPrefix: string;
  productSize: string | null;
  artwork: ArtworkFile;
}): Promise<ArtworkFile> {
  const { orderId, submittedPrefix, productSize, artwork } = input;
  const ext = extFromMime(artwork.mimeType);
  const attempt = parseArtworkUploadAttemptKey(artwork.fileKey, orderId, artwork.id, ext);
  const legacyExt = extFromFileName(artwork.fileKey);
  const legacyKey = artworkFileKeyFor(orderId, artwork.id, legacyExt);

  if (!attempt && artwork.fileKey !== legacyKey) {
    throw new DirectMailFileValidationError("Artwork file key is not valid for this order.");
  }
  const expectedBytes = attempt?.expectedByteSize ?? artwork.byteSize;
  if (expectedBytes !== artwork.byteSize) {
    throw new DirectMailFileValidationError("Artwork size metadata does not match its upload key.");
  }

  const uploaded = await downloadObjectWithinLimit(
    artwork.fileKey,
    MAX_ARTWORK_BYTES,
    expectedBytes,
  );
  const contentError = artworkContentError(uploaded.buffer, artwork.mimeType);
  if (contentError) throw new DirectMailFileValidationError(contentError);

  const inspection = await inspectArtwork(uploaded.buffer, artwork.mimeType, productSize);
  const inspectionError = fatalInspectionWarning(inspection.warnings);
  if (inspectionError) throw new DirectMailFileValidationError(inspectionError);
  const sealedKey = submittedFileKeyFor(submittedPrefix, "artwork", artwork.id, ext);
  await uploadCreateOnlyAtKey(sealedKey, {
    buffer: uploaded.buffer,
    mimeType: artwork.mimeType,
  });

  return {
    ...artwork,
    fileKey: sealedKey,
    byteSize: uploaded.byteSize,
    warnings: inspection.warnings,
  };
}

async function sealListFile(input: {
  orderId: string;
  submittedPrefix: string;
  list: ListFile;
}): Promise<ListFile> {
  const { orderId, submittedPrefix, list } = input;
  const attempt = parseListUploadAttemptKey(list.fileKey, orderId, list.id);
  const legacyKey = listFileKeyFor(orderId, list.id);

  if (!attempt && list.fileKey !== legacyKey) {
    throw new DirectMailFileValidationError("Mailing list file key is not valid for this order.");
  }
  const expectedBytes = attempt?.expectedByteSize ?? list.byteSize;
  if (expectedBytes !== list.byteSize) {
    throw new DirectMailFileValidationError("Mailing list size metadata does not match its upload key.");
  }

  const uploaded = await downloadObjectWithinLimit(list.fileKey, MAX_LIST_BYTES, expectedBytes);
  const originalText = decodeCsvBuffer(uploaded.buffer);
  const parsedCsv = parseListPreview(originalText);
  if (parsedCsv.error) {
    throw new DirectMailFileValidationError(parsedCsv.error);
  }
  if (parsedCsv.rowCount > MAX_LIST_ROWS) {
    throw new DirectMailFileValidationError(
      `Mailing list has too many rows. Maximum is ${MAX_LIST_ROWS}.`,
      413,
    );
  }
  const sentColumns = list.columns.filter((column) => !list.excludedColumns.includes(column));
  const sourceAlreadyFiltered = !attempt && sameStrings(parsedCsv.columns, sentColumns);
  if (
    parsedCsv.rowCount !== list.rowCount ||
    (!sameStrings(parsedCsv.columns, list.columns) && !sourceAlreadyFiltered)
  ) {
    throw new DirectMailFileValidationError("Mailing list content changed after finalization.");
  }
  if (
    !sourceAlreadyFiltered &&
    list.excludedColumns.some((column) => !parsedCsv.columns.includes(column))
  ) {
    throw new DirectMailFileValidationError("Mailing list exclusions do not match its columns.");
  }

  const filteredText = list.excludedColumns.length === 0 || sourceAlreadyFiltered
    ? originalText
    : filterCsvColumns(originalText, list.excludedColumns);
  const sealedBuffer = Buffer.from(sanitizeCsvForSpreadsheet(filteredText), "utf-8");
  if (sealedBuffer.byteLength > MAX_LIST_BYTES) {
    throw new DirectMailFileValidationError("Filtered mailing list exceeds the maximum size.", 413);
  }

  const sealedKey = submittedFileKeyFor(submittedPrefix, "list", list.id, "csv");
  await uploadCreateOnlyAtKey(sealedKey, {
    buffer: sealedBuffer,
    mimeType: "text/csv",
  });

  return {
    ...list,
    fileKey: sealedKey,
    byteSize: sealedBuffer.byteLength,
    rowCount: parsedCsv.rowCount,
    columns: list.columns,
    fillPercent: sourceAlreadyFiltered ? list.fillPercent : parsedCsv.fillPercent,
    warnings: parsedCsv.warnings,
  };
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fatalInspectionWarning(warnings: string[]): string | null {
  return warnings.find((warning) =>
    warning.startsWith("Could not parse PDF") ||
    warning === "PDF has no pages." ||
    warning === "Could not read PDF page."
  ) ?? null;
}

function fileFailureResponse(label: string, error: unknown): NextResponse {
  if (error instanceof DirectMailFileValidationError) {
    return NextResponse.json({ error: `Invalid ${label}: ${error.message}` }, { status: error.status });
  }
  logApiError(`direct-mail/seal-${label}`, error);
  return NextResponse.json(
    { error: `Failed to seal ${label}` },
    { status: 502 },
  );
}
