import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const body = (await request.json()) as {
      name: string;
      triggerType: string;
      conditions: Prisma.InputJsonValue;
      actionType: string;
      actionData: Prisma.InputJsonValue;
    };

    if (!body.name || !body.triggerType || !body.actionType) {
      return NextResponse.json({ error: "Name, triggerType, and actionType are required" }, { status: 400 });
    }

    const rule = await prisma.automationRule.create({
      data: {
        name: body.name,
        triggerType: body.triggerType,
        conditions: body.conditions ?? {},
        actionType: body.actionType,
        actionData: body.actionData ?? {},
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create automation rule" }, { status: 500 });
  }
}
