import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: campaignId } = await params;

  try {
    const body = (await request.json()) as { contactIds: string[] };

    if (!body.contactIds?.length) {
      return NextResponse.json({ error: "contactIds required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { emails: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const firstEmail = campaign.emails[0];
    const delayMs = firstEmail
      ? (firstEmail.delayDays * 86400000) + (firstEmail.delayHours * 3600000)
      : 0;
    const nextSendAt = new Date(Date.now() + delayMs);

    const results = await Promise.allSettled(
      body.contactIds.map((contactId) =>
        prisma.campaignEnrollment.upsert({
          where: { campaignId_contactId: { campaignId, contactId } },
          create: { campaignId, contactId, currentStep: 0, nextSendAt },
          update: {},
        }),
      ),
    );

    const enrolled = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ enrolled }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to enroll contacts" }, { status: 500 });
  }
}
