import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTrackSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  audience: z.enum(["agent_only", "public_only", "both"]).optional(),
  required: z.boolean().optional(),
  autoEnroll: z.boolean().optional(),
  dueDays: z.number().int().nullable().optional(),
  recurDays: z.number().int().nullable().optional(),
  passThreshold: z.number().int().min(0).max(100).optional(),
  reminderDays: z.number().nullable().optional(),
  reminderRepeat: z.number().nullable().optional(),
  contentIds: z.array(z.string()).optional(),
});

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const tracks = await prisma.trainingCourse.findMany({
    include: {
      items: {
        include: { content: true },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tracks);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = createTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const track = await prisma.trainingCourse.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      audience: parsed.data.audience ?? "agent_only",
      required: parsed.data.required ?? false,
      autoEnroll: parsed.data.autoEnroll ?? false,
      dueDays: parsed.data.dueDays ?? null,
      recurDays: parsed.data.recurDays ?? null,
      passThreshold: parsed.data.passThreshold ?? 80,
      reminderDays: parsed.data.reminderDays ?? null,
      reminderRepeat: parsed.data.reminderRepeat ?? null,
      ...(parsed.data.contentIds?.length
        ? {
            items: {
              create: parsed.data.contentIds.map((contentId, i) => ({
                contentId,
                sortOrder: i,
              })),
            },
          }
        : {}),
    },
    include: {
      items: { include: { content: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(track, { status: 201 });
}
