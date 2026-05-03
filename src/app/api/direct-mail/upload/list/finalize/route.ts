import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MAX_LIST_ROWS } from "@/lib/direct-mail/constants";
import { downloadObject, deleteObjects } from "@/lib/direct-mail/storage";
import { parseListPreview } from "@/lib/direct-mail/csv-validator";

const requestSchema = z.object({
  orderId: z.string().min(1),
  listId: z.string().min(1).max(64),
  fileKey: z.string().min(1),
  fileName: z.string().min(1).max(300),
  byteSize: z.number().int().nonnegative(),
});

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
    body = await req.json();
  } catch {
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
  if (!fileKey.startsWith(`${orderId}/`)) {
    return NextResponse.json({ error: "fileKey does not belong to this order" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    const obj = await downloadObject(fileKey);
    buffer = obj.buffer;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `Failed to read uploaded file: ${msg}` }, { status: 502 });
  }

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }

  const text = buffer.toString("utf-8");
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
    byteSize,
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
  if (!fileKey.startsWith(`${orderId}/`)) {
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
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `Storage delete failed: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
