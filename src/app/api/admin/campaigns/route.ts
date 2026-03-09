import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      emails: { orderBy: { sortOrder: "asc" }, select: { id: true, subject: true, sortOrder: true, channel: true, delayDays: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const body = (await request.json()) as {
      name: string;
      type?: string;
      triggerSource?: string;
      triggerType?: string;
      triggerStage?: string;
    };

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: body.name,
        type: body.type ?? "drip",
        triggerSource: body.triggerSource ?? null,
        triggerType: body.triggerType ?? null,
        triggerStage: body.triggerStage ?? null,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
