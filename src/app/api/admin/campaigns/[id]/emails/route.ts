import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { generateSubjectVariants } from "@/lib/email/ab-testing";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import {
  InvalidJsonBodyError,
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const campaignEmailSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(200_000),
  delayDays: z.number().int().min(0).max(365).optional(),
  delayHours: z.number().int().min(0).max(23).optional(),
  channel: z.string().trim().min(1).max(20).optional(),
  smsBody: z.string().max(1_600).nullable().optional(),
}).strict();

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id: campaignId } = await params;

  try {
    let raw: unknown;
    try {
      raw = await readJsonBodyWithLimit(request, 200_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      if (error instanceof InvalidJsonBodyError) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      throw error;
    }

    const parsed = campaignEmailSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Subject and body are required", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const maxOrder = await prisma.campaignEmail.aggregate({
      where: { campaignId },
      _max: { sortOrder: true },
    });

    const email = await prisma.campaignEmail.create({
      data: {
        campaignId,
        subject: parsed.data.subject,
        body: sanitizeRichHtml(parsed.data.body),
        delayDays: parsed.data.delayDays ?? 0,
        delayHours: parsed.data.delayHours ?? 0,
        channel: parsed.data.channel ?? "email",
        smsBody: parsed.data.smsBody ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    await generateSubjectVariants(email.id, parsed.data.subject);

    return NextResponse.json(email, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign email" }, { status: 500 });
  }
}
