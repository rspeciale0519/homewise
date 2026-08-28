import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  DirectMailFileValidationError,
  artworkContentError,
  deleteObjects,
  downloadObjectWithinLimit,
  extFromMime,
  fileNameMatchesMime,
  isUploadAttemptKeyForOrder,
  parseArtworkUploadAttemptKey,
} from "@/lib/direct-mail/storage";
import { inspectArtwork } from "@/lib/direct-mail/artwork-validator";
import {
  ACCEPTED_ARTWORK_MIME,
  MAX_ARTWORK_BYTES,
} from "@/lib/direct-mail/constants";
import { logApiError } from "@/lib/api-error";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

const requestSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  artworkId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  byteSize: z.number().int().positive().max(MAX_ARTWORK_BYTES),
  mimeType: z.string().min(1).max(200),
}).strict();

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(req, 4_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { orderId, artworkId, fileKey, fileName, byteSize, mimeType } = parsed.data;

  if (!ACCEPTED_ARTWORK_MIME.includes(mimeType as (typeof ACCEPTED_ARTWORK_MIME)[number])) {
    return NextResponse.json({ error: "Unsupported artwork file type." }, { status: 415 });
  }
  if (!fileNameMatchesMime(fileName, mimeType)) {
    return NextResponse.json(
      { error: "The filename extension does not match the selected file type." },
      { status: 400 },
    );
  }

  const order = await prisma.mailOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true, productSize: true },
  });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Submitted orders cannot accept new files" }, { status: 409 });
  }
  const attempt = parseArtworkUploadAttemptKey(
    fileKey,
    orderId,
    artworkId,
    extFromMime(mimeType),
  );
  if (!attempt || attempt.expectedByteSize !== byteSize) {
    return NextResponse.json({ error: "Invalid signed artwork upload key." }, { status: 400 });
  }

  let uploaded: Awaited<ReturnType<typeof downloadObjectWithinLimit>>;
  try {
    uploaded = await downloadObjectWithinLimit(fileKey, MAX_ARTWORK_BYTES, byteSize);
  } catch (e) {
    if (e instanceof DirectMailFileValidationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    logApiError("direct-mail/artwork-finalize-read", e);
    return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 502 });
  }

  if (normalizeMime(uploaded.mimeType) !== normalizeMime(mimeType)) {
    return NextResponse.json({ error: "Uploaded file content type does not match." }, { status: 415 });
  }

  const contentError = artworkContentError(uploaded.buffer, mimeType);
  if (contentError) {
    return NextResponse.json({ error: contentError }, { status: 415 });
  }

  const inspection = await inspectArtwork(uploaded.buffer, mimeType, order.productSize);
  const inspectionError = fatalInspectionWarning(inspection.warnings);
  if (inspectionError) {
    return NextResponse.json({ error: inspectionError }, { status: 415 });
  }

  return NextResponse.json({
    fileKey,
    fileName,
    byteSize: uploaded.byteSize,
    mimeType,
    warnings: inspection.warnings,
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId") ?? "";
  const fileKey = url.searchParams.get("fileKey") ?? "";
  if (!orderId || !fileKey) {
    return NextResponse.json({ error: "orderId and fileKey required" }, { status: 400 });
  }
  if (!isUploadAttemptKeyForOrder(fileKey, orderId)) {
    return NextResponse.json({ error: "fileKey does not belong to this order" }, { status: 400 });
  }

  const order = await prisma.mailOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Cannot delete files from submitted orders" }, { status: 409 });
  }

  try {
    await deleteObjects([fileKey]);
  } catch (e) {
    logApiError("direct-mail/artwork-delete", e);
    return NextResponse.json({ error: "Storage delete failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

function normalizeMime(mimeType: string): string {
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();
}

function fatalInspectionWarning(warnings: string[]): string | null {
  return warnings.find((warning) =>
    warning.startsWith("Could not parse PDF") ||
    warning === "PDF has no pages." ||
    warning === "Could not read PDF page."
  ) ?? null;
}
