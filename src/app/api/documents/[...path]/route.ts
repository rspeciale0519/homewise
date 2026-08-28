import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import {
  resolveContainedPath,
  resolveRealContainedPath,
} from "@/lib/documents/safe-path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
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

  const { path: segments } = await params;
  const filePath = segments.join("/");

  const document = await prisma.document.findFirst({
    where: {
      storageKey: filePath,
      storageProvider: "local",
      published: true,
      platforms: { has: "homewise" },
    },
    select: { storageKey: true },
  });
  if (!document?.storageKey) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const documentsDir = path.join(process.cwd(), "private", "documents");
  const fullPath = resolveContainedPath(documentsDir, document.storageKey);
  if (!fullPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const realPath = await resolveRealContainedPath(documentsDir, fullPath);
    if (!realPath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const fileBuffer = await readFile(realPath);
    const ext = path.extname(realPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const fileName = path.basename(realPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
