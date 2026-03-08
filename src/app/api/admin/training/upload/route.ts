import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".docx",
  ".doc",
  ".png",
  ".jpg",
  ".jpeg",
];

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
];

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = uploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { filename, contentType } = parsed.data;

  const extension = getFileExtension(filename);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      {
        error: "File type not allowed",
        allowed: ALLOWED_EXTENSIONS,
      },
      { status: 400 },
    );
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      {
        error: "Content type not allowed",
        allowed: ALLOWED_CONTENT_TYPES,
      },
      { status: 400 },
    );
  }

  const uniqueId = crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);
  const fileKey = `training/${uniqueId}-${sanitized}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("training-files")
    .createSignedUploadUrl(fileKey);

  if (error) {
    return NextResponse.json(
      { error: "Failed to create upload URL", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { uploadUrl: data.signedUrl, fileKey },
    { status: 200 },
  );
}
