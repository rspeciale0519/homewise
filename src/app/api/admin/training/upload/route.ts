import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import {
  ADMIN_UPLOAD_CONTENT_TYPES,
  AdminUploadStorageError,
  AdminUploadValidationError,
  TRAINING_UPLOAD_LIMITS,
  adminUploadLimitFor,
  createPendingAdminUploadKey,
  finalizeAdminUpload,
  getAdminUploadExtension,
  isPermittedAdminUploadPair,
} from "@/lib/http/admin-upload";

const ALLOWED_EXTENSIONS = Object.keys(ADMIN_UPLOAD_CONTENT_TYPES);
const ALLOWED_CONTENT_TYPES = [...new Set(Object.values(ADMIN_UPLOAD_CONTENT_TYPES))];

const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(100),
  byteSize: z.number().int().positive(),
}).strict();

const finalizeSchema = z.object({
  pendingKey: z.string().min(1).max(500),
  contentType: z.string().trim().min(1).max(100),
  byteSize: z.number().int().positive(),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 2_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = uploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { filename, contentType, byteSize } = parsed.data;

  if (getAdminUploadExtension(filename) === null) {
    return NextResponse.json(
      {
        error: "File type not allowed",
        allowed: ALLOWED_EXTENSIONS,
      },
      { status: 400 },
    );
  }

  if (!isPermittedAdminUploadPair(filename, contentType)) {
    return NextResponse.json(
      {
        error: "The filename extension does not match the content type",
        allowed: ALLOWED_CONTENT_TYPES,
      },
      { status: 400 },
    );
  }

  const maxBytes = adminUploadLimitFor(filename, TRAINING_UPLOAD_LIMITS);
  if (maxBytes === null || byteSize > maxBytes) {
    return NextResponse.json(
      { error: "File exceeds the limit for its type" },
      { status: 413 },
    );
  }

  const pendingKey = createPendingAdminUploadKey(filename, byteSize);

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("training-files")
    .createSignedUploadUrl(pendingKey, { upsert: false });

  if (error || !data) {
    logApiError("admin/training/upload", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { uploadUrl: data.signedUrl, pendingKey },
    { status: 200 },
  );
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 2_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = finalizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  try {
    const finalized = await finalizeAdminUpload(
      supabase.storage.from("training-files"),
      {
        ...parsed.data,
        finalPrefix: "training",
        limits: TRAINING_UPLOAD_LIMITS,
      },
    );
    return NextResponse.json({
      fileKey: finalized.fileKey,
      mimeType: finalized.contentType,
      sizeBytes: finalized.byteSize,
    });
  } catch (error) {
    if (error instanceof AdminUploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminUploadStorageError) {
      logApiError("admin/training/upload-finalize", error);
      return NextResponse.json({ error: "Failed to validate uploaded file" }, { status: 502 });
    }
    throw error;
  }
}
