import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAgentId(userId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { role: true, agentProfile: { select: { id: true } } },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) return null;
  return profile.agentProfile?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const recents = await prisma.documentRecent.findMany({
    where: { agentId },
    orderBy: { viewedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ recents });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = await getAgentId(user.id);
  if (!agentId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { documentPath, documentName } = await request.json();
  if (!documentPath || !documentName) {
    return NextResponse.json({ error: "documentPath and documentName required" }, { status: 400 });
  }

  await prisma.documentRecent.upsert({
    where: { agentId_documentPath: { agentId, documentPath } },
    update: { viewedAt: new Date(), documentName },
    create: { agentId, documentPath, documentName },
  });

  // Cap at 20 entries
  const all = await prisma.documentRecent.findMany({
    where: { agentId },
    orderBy: { viewedAt: "desc" },
    select: { id: true },
  });

  if (all.length > 20) {
    const idsToDelete = all.slice(20).map((r) => r.id);
    await prisma.documentRecent.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  }

  return NextResponse.json({ success: true });
}
