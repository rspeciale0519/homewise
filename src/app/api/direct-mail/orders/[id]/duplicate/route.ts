import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  artworkFileKeyFor,
  copyToKey,
  fileKeyFor,
  getSignedUrl,
} from "@/lib/direct-mail/storage";
import type { ArtworkFile } from "@/lib/direct-mail/types";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  let body: { includeList?: boolean } = {};
  try {
    body = (await req.json()) as { includeList?: boolean };
  } catch {
    body = {};
  }
  const includeList = body.includeList === true;

  const source = await prisma.mailOrder.findUnique({ where: { id } });
  if (!source || source.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = await prisma.mailOrder.create({
    data: {
      userId: profile.id,
      status: "draft",
      currentStep: 1,
      workflow: source.workflow,
      subjectPropertyAddress: source.subjectPropertyAddress,
      campaignName: source.campaignName,
      productType: source.productType,
      productSize: source.productSize,
      mailClass: source.mailClass,
      dropDate: null,
      returnAddress: source.returnAddress ?? undefined,
      quantity: includeList ? source.quantity : 0,
      listRowCount: includeList ? source.listRowCount : 0,
      specialInstructions: source.specialInstructions,
      complianceConfirmed: false,
    },
    select: { id: true },
  });

  const sourceArtwork = Array.isArray(source.artworkFiles)
    ? (source.artworkFiles as unknown as ArtworkFile[])
    : [];

  const newArtwork: ArtworkFile[] = [];
  for (const f of sourceArtwork) {
    const newId = nanoid(12);
    const newKey = artworkFileKeyFor(draft.id, newId, ext(f.fileKey));
    await copyKey(f.fileKey, newKey, f.mimeType);
    newArtwork.push({
      id: newId,
      name: f.name,
      fileKey: newKey,
      fileName: f.fileName,
      byteSize: f.byteSize,
      mimeType: f.mimeType,
      warnings: f.warnings,
    });
  }

  let listFileKey: string | null = null;
  if (includeList && source.listFileKey) {
    const newListKey = fileKeyFor(draft.id, "list", ext(source.listFileKey));
    await copyKey(source.listFileKey, newListKey, "text/csv");
    listFileKey = newListKey;
  }

  await prisma.mailOrder.update({
    where: { id: draft.id },
    data: {
      artworkFiles: newArtwork as unknown as object,
      ...(listFileKey ? { listFileKey } : {}),
    },
  });

  return NextResponse.json({ orderId: draft.id });
}

async function copyKey(srcKey: string, destKey: string, mimeType: string) {
  const url = await getSignedUrl(srcKey, 60);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch source file ${srcKey}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await copyToKey(destKey, { buffer: buf, mimeType });
}

function ext(key: string): string {
  const idx = key.lastIndexOf(".");
  return idx >= 0 ? key.slice(idx + 1) : "bin";
}
