import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { draftSchema } from "@/schemas/document-viewer.schema";
import { getAgentId } from "@/lib/documents/get-agent-id";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ drafts: [] });

  const drafts = await prisma.documentDraft.findMany({
    where: { agentId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, documentPath: true, documentName: true, updatedAt: true },
  });

  return NextResponse.json({ drafts });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ success: true });

  const body = await request.json();
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const draft = await prisma.documentDraft.upsert({
    where: { agentId_documentPath: { agentId, documentPath: parsed.data.documentPath } },
    update: {
      documentName: parsed.data.documentName,
      annotations: parsed.data.annotations,
    },
    create: {
      agentId,
      documentPath: parsed.data.documentPath,
      documentName: parsed.data.documentName,
      annotations: parsed.data.annotations,
    },
  });

  return NextResponse.json({ draft: { id: draft.id } });
}
