import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MAX_LIST_BYTES, MAX_LIST_ROWS } from "@/lib/direct-mail/constants";
import { uploadOrderFile } from "@/lib/direct-mail/storage";
import { parseListPreview } from "@/lib/direct-mail/csv-validator";
import type { ListUploadResult } from "@/lib/direct-mail/types";

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

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId") ?? "";
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_LIST_BYTES) {
    return NextResponse.json(
      { error: `File too large (${Math.round(file.size / 1024 / 1024)} MB). Max ${Math.round(MAX_LIST_BYTES / 1024 / 1024)} MB.` },
      { status: 413 },
    );
  }

  const text = await file.text();

  const parsed = parseListPreview(text);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.rowCount > MAX_LIST_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${parsed.rowCount}). Max ${MAX_LIST_ROWS}.` },
      { status: 413 },
    );
  }
  if (parsed.rowCount < 1) {
    return NextResponse.json({ error: "List has no data rows." }, { status: 400 });
  }

  const buffer = Buffer.from(text, "utf-8");
  const fileKey = await uploadOrderFile(orderId, "list", {
    buffer,
    mimeType: "text/csv",
    ext: "csv",
  });

  const result: ListUploadResult = {
    fileKey,
    fileName: file.name,
    byteSize: file.size,
    rowCount: parsed.rowCount,
    previewRows: parsed.previewRows,
    warnings: parsed.warnings,
  };

  return NextResponse.json(result);
}
