import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  ACCEPTED_LIST_MIME,
  MAX_LIST_BYTES,
  MAX_LIST_FILES_PER_ORDER,
} from "@/lib/direct-mail/constants";
import {
  createSignedUploadUrl,
  listFileKeyFor,
} from "@/lib/direct-mail/storage";
import type { ListFile } from "@/lib/direct-mail/types";

const requestSchema = z.object({
  orderId: z.string().min(1),
  listId: z.string().min(1).max(64),
  fileName: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
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
  const { orderId, listId, mimeType, byteSize } = parsed.data;

  const acceptedMime =
    ACCEPTED_LIST_MIME.includes(mimeType as (typeof ACCEPTED_LIST_MIME)[number]) ||
    mimeType === "" ||
    mimeType.toLowerCase().endsWith("/csv");
  if (!acceptedMime) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}. Use a CSV file.` },
      { status: 415 },
    );
  }
  if (byteSize > MAX_LIST_BYTES) {
    return NextResponse.json(
      { error: `File too large (${Math.round(byteSize / 1024 / 1024)} MB). Max ${Math.round(MAX_LIST_BYTES / 1024 / 1024)} MB.` },
      { status: 413 },
    );
  }

  const order = await prisma.mailOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true, listFiles: true },
  });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Submitted orders cannot accept new files" }, { status: 409 });
  }

  const existing = Array.isArray(order.listFiles)
    ? (order.listFiles as unknown as ListFile[])
    : [];
  const isReplacing = existing.some((f) => f.id === listId);
  if (!isReplacing && existing.length >= MAX_LIST_FILES_PER_ORDER) {
    return NextResponse.json(
      { error: `At most ${MAX_LIST_FILES_PER_ORDER} mailing lists per order.` },
      { status: 409 },
    );
  }

  const fileKey = listFileKeyFor(orderId, listId);

  let signed: { signedUrl: string; token: string };
  try {
    signed = await createSignedUploadUrl(fileKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `Storage error: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({
    fileKey,
    signedUrl: signed.signedUrl,
    token: signed.token,
  });
}
