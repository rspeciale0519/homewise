import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { documentFavoriteSchema } from "@/schemas/document-viewer.schema";
import { getAgentId } from "@/lib/documents/get-agent-id";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ favorites: [] });

  const favorites = await prisma.documentFavorite.findMany({
    where: { agentId },
    orderBy: { savedAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ error: "No agent profile found" }, { status: 404 });

  const body = await request.json();
  const parsed = documentFavoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await prisma.documentFavorite.upsert({
    where: {
      agentId_documentPath: { agentId, documentPath: parsed.data.documentPath },
    },
    update: { documentId: parsed.data.documentId ?? null },
    create: {
      agentId,
      documentPath: parsed.data.documentPath,
      documentId: parsed.data.documentId ?? null,
      documentName: parsed.data.documentName,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ error: "No agent profile found" }, { status: 404 });

  const { documentPath } = await request.json();
  if (!documentPath) {
    return NextResponse.json({ error: "documentPath is required" }, { status: 400 });
  }

  await prisma.documentFavorite.deleteMany({
    where: { agentId, documentPath },
  });

  return NextResponse.json({ success: true });
}
