import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uploadOrderFile, getSignedUrl } from "@/lib/direct-mail/storage";

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

  if (source.frontFileKey) {
    await copyKey(source.frontFileKey, draft.id, "front");
  }
  if (source.backFileKey) {
    await copyKey(source.backFileKey, draft.id, "back");
  }
  if (includeList && source.listFileKey) {
    await copyKey(source.listFileKey, draft.id, "list");
  }

  const data: {
    frontFileKey?: string;
    backFileKey?: string;
    listFileKey?: string;
  } = {};
  if (source.frontFileKey) data.frontFileKey = `${draft.id}/front.${ext(source.frontFileKey)}`;
  if (source.backFileKey) data.backFileKey = `${draft.id}/back.${ext(source.backFileKey)}`;
  if (includeList && source.listFileKey) {
    data.listFileKey = `${draft.id}/list.${ext(source.listFileKey)}`;
  }
  if (Object.keys(data).length > 0) {
    await prisma.mailOrder.update({ where: { id: draft.id }, data });
  }

  return NextResponse.json({ orderId: draft.id });
}

async function copyKey(srcKey: string, newOrderId: string, slot: "front" | "back" | "list") {
  const url = await getSignedUrl(srcKey, 60);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch source file ${srcKey}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "application/octet-stream";
  await uploadOrderFile(newOrderId, slot, {
    buffer: buf,
    mimeType: mime,
    ext: ext(srcKey),
  });
}

function ext(key: string): string {
  const idx = key.lastIndexOf(".");
  return idx >= 0 ? key.slice(idx + 1) : "bin";
}
