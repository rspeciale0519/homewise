import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signatureSchema } from "@/schemas/document-viewer.schema";

async function getAgentId(userId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { role: true, agentProfile: { select: { id: true } } },
  });

  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return null;
  }

  return profile.agentProfile?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentId = await getAgentId(user.id);
  if (!agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sig = await prisma.documentSignature.findUnique({
    where: { agentId },
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

  const agentId = await getAgentId(user.id);
  if (!agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    where: { agentId },
    update: { imageData: parsed.data.imageData },
    create: { agentId, imageData: parsed.data.imageData },
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

  const agentId = await getAgentId(user.id);
  if (!agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.documentSignature.deleteMany({ where: { agentId } });

  return NextResponse.json({ success: true });
}
