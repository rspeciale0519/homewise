import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { resolveDocumentSlug } from "@/lib/slug/resolve";
import { readFile } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "agent" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const resolved = await resolveDocumentSlug(slug);
  if (!resolved) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (resolved.redirectFrom && resolved.record.slug) {
    const redirectTo = new URL(
      `/api/documents/by-slug/${resolved.record.slug}`,
      request.url,
    );
    return NextResponse.redirect(redirectTo, 308);
  }

  const document = await prisma.document.findUnique({
    where: { id: resolved.record.id },
  });
  if (!document || !document.published) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (document.external && document.url) {
    return NextResponse.redirect(document.url, 302);
  }

  if (!document.storageKey) {
    return NextResponse.json({ error: "No file attached" }, { status: 404 });
  }

  if (document.storageProvider === "supabase") {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(document.storageKey, 3600);
    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 },
      );
    }
    return NextResponse.redirect(data.signedUrl, 302);
  }

  // Local filesystem (legacy seeded docs)
  const documentsDir = path.join(process.cwd(), "private", "documents");
  const fullPath = path.resolve(documentsDir, document.storageKey);
  if (!fullPath.startsWith(documentsDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(fullPath)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
