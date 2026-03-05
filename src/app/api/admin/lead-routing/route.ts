import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const [rules, agents] = await Promise.all([
    prisma.leadRoutingRule.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.agent.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  return NextResponse.json({
    rules: rules.map((r) => ({
      ...r,
      conditions: r.conditions as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    agents,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await req.json();
  const { name, agentId, conditions, priority, roundRobin } = body as {
    name: string;
    agentId: string;
    conditions: Record<string, unknown>;
    priority?: number;
    roundRobin?: boolean;
  };

  if (!name || !agentId) {
    return NextResponse.json({ error: "name and agentId required" }, { status: 400 });
  }

  const rule = await prisma.leadRoutingRule.create({
    data: {
      name,
      agentId,
      conditions: (conditions ?? {}) as Prisma.InputJsonValue,
      priority: priority ?? 0,
      roundRobin: roundRobin ?? false,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await req.json();
  const { id, ...data } = body as {
    id: string;
    name?: string;
    agentId?: string;
    conditions?: Record<string, unknown>;
    priority?: number;
    roundRobin?: boolean;
    active?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updateData: Prisma.LeadRoutingRuleUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.agentId !== undefined) updateData.agentId = data.agentId;
  if (data.conditions !== undefined) updateData.conditions = data.conditions as Prisma.InputJsonValue;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.roundRobin !== undefined) updateData.roundRobin = data.roundRobin;
  if (data.active !== undefined) updateData.active = data.active;

  const updated = await prisma.leadRoutingRule.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = (await req.json()) as { id: string };
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.leadRoutingRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
