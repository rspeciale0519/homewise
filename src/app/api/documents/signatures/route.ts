import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signatureSchema } from "@/schemas/document-viewer.schema";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sig = await prisma.documentSignature.findUnique({
    where: { userId: user.id },
    select: { imageData: true, updatedAt: true },
  });

  return NextResponse.json({ signature: sig });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = signatureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const sig = await prisma.documentSignature.upsert({
    where: { userId: user.id },
    update: { imageData: parsed.data.imageData },
    create: { userId: user.id, imageData: parsed.data.imageData },
  });

  return NextResponse.json({ signature: { imageData: sig.imageData, updatedAt: sig.updatedAt } });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.documentSignature.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ success: true });
}
