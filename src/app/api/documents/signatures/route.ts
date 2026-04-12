import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createSignatureSchema,
  updateSignatureSchema,
  deleteSignatureSchema,
} from "@/schemas/document-viewer.schema";

const MAX_SIGNATURES = 10;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const signatures = await prisma.documentSignature.findMany({
    where: { userId: user.id },
    select: { id: true, label: true, imageData: true, source: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ signatures });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSignatureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const count = await prisma.documentSignature.count({ where: { userId: user.id } });
  if (count >= MAX_SIGNATURES) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_SIGNATURES} signatures reached` },
      { status: 409 }
    );
  }

  const sig = await prisma.documentSignature.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      imageData: parsed.data.imageData,
      source: parsed.data.source,
    },
    select: { id: true, label: true, imageData: true, source: true, createdAt: true },
  });

  return NextResponse.json({ signature: sig }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateSignatureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.documentSignature.findFirst({
    where: { id: parsed.data.id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Signature not found" }, { status: 404 });

  const sig = await prisma.documentSignature.update({
    where: { id: parsed.data.id },
    data: { label: parsed.data.label },
    select: { id: true, label: true, updatedAt: true },
  });

  return NextResponse.json({ signature: sig });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = deleteSignatureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.documentSignature.findFirst({
    where: { id: parsed.data.id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Signature not found" }, { status: 404 });

  await prisma.documentSignature.delete({ where: { id: parsed.data.id } });

  return NextResponse.json({ success: true });
}
