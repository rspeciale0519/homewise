import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  ACCEPTED_ARTWORK_MIME,
  MAX_ARTWORK_BYTES,
  MAX_ARTWORK_FILES_PER_ORDER,
} from "@/lib/direct-mail/constants";
import {
  artworkUploadAttemptKeyFor,
  createSignedUploadUrl,
  extFromMime,
  fileNameMatchesMime,
} from "@/lib/direct-mail/storage";
import type { ArtworkFile } from "@/lib/direct-mail/types";
import { publicMutationRateLimiter } from "@/lib/public-rate-limit";
import { logApiError } from "@/lib/api-error";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

const requestSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  artworkId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  fileName: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  byteSize: z.number().int().positive(),
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
  const { orderId, artworkId, fileName, mimeType, byteSize } = parsed.data;

  if (!ACCEPTED_ARTWORK_MIME.includes(mimeType as (typeof ACCEPTED_ARTWORK_MIME)[number])) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}. Use PDF, PNG, or JPG.` },
      { status: 415 },
    );
  }
  if (!fileNameMatchesMime(fileName, mimeType)) {
    return NextResponse.json(
      { error: "The filename extension does not match the selected file type." },
      { status: 400 },
    );
  }
  if (byteSize > MAX_ARTWORK_BYTES) {
    return NextResponse.json(
      { error: `File too large (${Math.round(byteSize / 1024 / 1024)} MB). Max 50 MB.` },
      { status: 413 },
    );
  }

  const order = await prisma.mailOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true, artworkFiles: true },
  });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Submitted orders cannot accept new files" }, { status: 409 });
  }

  const existing = Array.isArray(order.artworkFiles)
    ? (order.artworkFiles as unknown as ArtworkFile[])
    : [];
  const isReplacing = existing.some((f) => f.id === artworkId);
  if (!isReplacing && existing.length >= MAX_ARTWORK_FILES_PER_ORDER) {
    return NextResponse.json(
      { error: `At most ${MAX_ARTWORK_FILES_PER_ORDER} artwork files per order.` },
      { status: 409 },
    );
  }

  const signLimit = await publicMutationRateLimiter.consume([
    { key: `direct-mail-sign:user:${profile.id}`, limit: 100 },
    { key: `direct-mail-sign:order:${order.id}`, limit: 40 },
  ]);
  if (!signLimit.allowed) {
    return NextResponse.json(
      {
        error: signLimit.unavailable
          ? "The upload service is temporarily unavailable. Please try again later."
          : "Too many upload requests. Please try again later.",
      },
      {
        status: signLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(signLimit.retryAfterSeconds) },
      },
    );
  }

  const ext = extFromMime(mimeType);
  const fileKey = artworkUploadAttemptKeyFor(orderId, artworkId, byteSize, ext);

  let signed: { signedUrl: string; token: string };
  try {
    signed = await createSignedUploadUrl(fileKey);
  } catch (e) {
    logApiError("direct-mail/artwork-sign", e);
    return NextResponse.json({ error: "Storage request failed" }, { status: 502 });
  }

  return NextResponse.json({
    fileKey,
    signedUrl: signed.signedUrl,
    token: signed.token,
  });
}
