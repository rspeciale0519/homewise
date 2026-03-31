import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 500 * 1024; // 500KB (already cropped)
const BUCKET = "user-avatars";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
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
      { error: "File too large. Maximum size is 500KB" },
      { status: 400 }
    );
  }

  const filePath = `${user.id}/avatar.webp`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[user/avatar] Upload error:", uploadError.message);
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(filePath);

  // Append cache-buster so browsers/CDN pick up the new image
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const filePath = `${user.id}/avatar.webp`;

  const { error: deleteError } = await admin.storage
    .from(BUCKET)
    .remove([filePath]);

  if (deleteError) {
    console.error("[user/avatar] Delete error:", deleteError.message);
    return NextResponse.json(
      { error: `Delete failed: ${deleteError.message}` },
      { status: 500 }
    );
  }

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ success: true });
}
