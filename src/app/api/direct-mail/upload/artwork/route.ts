import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  ACCEPTED_ARTWORK_MIME,
  MAX_ARTWORK_BYTES,
} from "@/lib/direct-mail/constants";
import {
  extFromFileName,
  extFromMime,
  uploadOrderFile,
} from "@/lib/direct-mail/storage";
import type { ArtworkUploadResult } from "@/lib/direct-mail/types";

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
  const slot = url.searchParams.get("slot");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });
  if (slot !== "front" && slot !== "back") {
    return NextResponse.json({ error: "slot must be 'front' or 'back'" }, { status: 400 });
  }

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

  const warnings: string[] = [];

  if (!ACCEPTED_ARTWORK_MIME.includes(file.type as (typeof ACCEPTED_ARTWORK_MIME)[number])) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}. Use PDF, PNG, or JPG.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_ARTWORK_BYTES) {
    return NextResponse.json(
      { error: `File too large (${Math.round(file.size / 1024 / 1024)} MB). Max 50 MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extFromFileName(file.name) || extFromMime(file.type);

  const fileKey = await uploadOrderFile(orderId, slot, {
    buffer,
    mimeType: file.type,
    ext,
  });

  const result: ArtworkUploadResult = {
    fileKey,
    fileName: file.name,
    byteSize: file.size,
    mimeType: file.type,
    warnings,
  };

  return NextResponse.json(result);
}
