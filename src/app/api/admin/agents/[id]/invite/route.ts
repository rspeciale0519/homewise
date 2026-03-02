import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createInviteCode } from "@/lib/invite-codes";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.userId) {
    return NextResponse.json(
      { error: "Agent already has a linked account" },
      { status: 400 }
    );
  }

  const updated = await createInviteCode(id);

  return NextResponse.json({
    inviteCode: updated.inviteCode,
    inviteExpiresAt: updated.inviteExpiresAt,
    inviteUsed: updated.inviteUsed,
  });
}
