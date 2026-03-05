import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSubjectVariants } from "@/lib/email/ab-testing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: campaignId } = await params;

  try {
    const body = (await request.json()) as {
      subject: string;
      body: string;
      delayDays?: number;
      delayHours?: number;
      channel?: string;
      smsBody?: string;
    };

    if (!body.subject || !body.body) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    const maxOrder = await prisma.campaignEmail.aggregate({
      where: { campaignId },
      _max: { sortOrder: true },
    });

    const email = await prisma.campaignEmail.create({
      data: {
        campaignId,
        subject: body.subject,
        body: body.body,
        delayDays: body.delayDays ?? 0,
        delayHours: body.delayHours ?? 0,
        channel: body.channel ?? "email",
        smsBody: body.smsBody ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    // Auto-generate A/B subject line variants
    await generateSubjectVariants(email.id, body.subject);

    return NextResponse.json(email, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign email" }, { status: 500 });
  }
}
