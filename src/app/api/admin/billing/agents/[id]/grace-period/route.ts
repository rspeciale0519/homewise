import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { adminExtendGracePeriodSchema } from "@/schemas/billing.schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminExtendGracePeriodSchema.safeParse({
    ...(body as Record<string, unknown>),
    agentId: id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { extendedUntil, reason } = parsed.data;

  try {
    const override = await prisma.gracePeriodOverride.create({
      data: {
        agentId: id,
        extendedUntil: new Date(extendedUntil),
        reason,
        grantedBy: auth.user.id,
      },
    });

    return NextResponse.json({ gracePeriodOverride: override }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
