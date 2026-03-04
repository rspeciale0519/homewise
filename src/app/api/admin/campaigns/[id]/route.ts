import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      emails: {
        orderBy: { sortOrder: "asc" },
        include: { variants: { orderBy: { variant: "asc" } } },
      },
      enrollments: {
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        status: typeof body.status === "string" ? body.status : undefined,
        triggerSource: typeof body.triggerSource === "string" ? body.triggerSource : undefined,
        triggerType: typeof body.triggerType === "string" ? body.triggerType : undefined,
        triggerStage: typeof body.triggerStage === "string" ? body.triggerStage : undefined,
      },
    });

    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
