import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { readFormDataBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { detectRasterImageType, rasterImageExtension } from "@/lib/http/raster-image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_BODY_SIZE = MAX_SIZE + 64 * 1024;
const BUCKET = "agent-photos";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  let formData: FormData;
  try {
    formData = await readFormDataBodyWithLimit(request, MAX_BODY_SIZE);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectRasterImageType(buffer);
  if (!detectedType || detectedType !== file.type) {
    return NextResponse.json(
      { error: "File content does not match its image type" },
      { status: 400 },
    );
  }

  const ext = rasterImageExtension(detectedType);
  const timestamp = Date.now();
  const safeName = `agent-${timestamp}.${ext}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(safeName, buffer, {
      contentType: detectedType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[admin/upload] Storage upload error:", uploadError.message);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(safeName);

  return NextResponse.json({ url: urlData.publicUrl });
}
