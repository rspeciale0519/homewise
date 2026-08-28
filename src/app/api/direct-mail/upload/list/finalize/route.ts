import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  ACCEPTED_LIST_MIME,
  MAX_LIST_BYTES,
  MAX_LIST_ROWS,
} from "@/lib/direct-mail/constants";
import {
  DirectMailFileValidationError,
  decodeCsvBuffer,
  deleteObjects,
  downloadObjectWithinLimit,
  isUploadAttemptKeyForOrder,
  parseListUploadAttemptKey,
} from "@/lib/direct-mail/storage";
import { parseListPreview } from "@/lib/direct-mail/csv-validator";
import { logApiError } from "@/lib/api-error";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

const requestSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  listId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  byteSize: z.number().int().positive().max(MAX_LIST_BYTES),
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
  const { orderId, listId, fileKey, fileName, byteSize } = parsed.data;

  const order = await prisma.mailOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Submitted orders cannot accept new files" }, { status: 409 });
  }
  const attempt = parseListUploadAttemptKey(fileKey, orderId, listId);
  if (!attempt || attempt.expectedByteSize !== byteSize) {
    return NextResponse.json({ error: "Invalid signed list upload key." }, { status: 400 });
  }

  let uploaded: Awaited<ReturnType<typeof downloadObjectWithinLimit>>;
  try {
    uploaded = await downloadObjectWithinLimit(fileKey, MAX_LIST_BYTES, byteSize);
  } catch (e) {
    if (e instanceof DirectMailFileValidationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    logApiError("direct-mail/list-finalize-read", e);
    return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 502 });
  }

  const mimeType = uploaded.mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const acceptedMime =
    ACCEPTED_LIST_MIME.includes(mimeType as (typeof ACCEPTED_LIST_MIME)[number]) ||
    mimeType.endsWith("/csv");
  if (!acceptedMime) {
    return NextResponse.json({ error: "Uploaded file content type is not CSV." }, { status: 415 });
  }

  let text: string;
  try {
    text = decodeCsvBuffer(uploaded.buffer);
  } catch (e) {
    if (e instanceof DirectMailFileValidationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
  const parsedCsv = parseListPreview(text);
  if (parsedCsv.error) {
    return NextResponse.json({ error: parsedCsv.error }, { status: 400 });
  }
  if (parsedCsv.rowCount > MAX_LIST_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${parsedCsv.rowCount}). Max ${MAX_LIST_ROWS}.` },
      { status: 413 },
    );
  }

  return NextResponse.json({
    listId,
    fileKey,
    fileName,
    byteSize: uploaded.byteSize,
    rowCount: parsedCsv.rowCount,
    columns: parsedCsv.columns,
    fillPercent: parsedCsv.fillPercent,
    previewRows: parsedCsv.previewRows,
    warnings: parsedCsv.warnings,
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
    logApiError("direct-mail/list-delete", e);
    return NextResponse.json({ error: "Storage delete failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
