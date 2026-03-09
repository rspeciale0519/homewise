import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addTagSchema = z.object({ tagName: z.string().min(1) });
const removeTagSchema = z.object({ tagId: z.string().min(1) });

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = addTagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const tag = await prisma.tag.upsert({
    where: { name: parsed.data.tagName },
    create: { name: parsed.data.tagName },
    update: {},
  });

  const contactTag = await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId: id, tagId: tag.id } },
    create: { contactId: id, tagId: tag.id },
    update: {},
    include: { tag: true },
  });

  return NextResponse.json(contactTag, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = removeTagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await prisma.contactTag.deleteMany({
    where: { contactId: id, tagId: parsed.data.tagId },
  });

  return NextResponse.json({ success: true });
}
