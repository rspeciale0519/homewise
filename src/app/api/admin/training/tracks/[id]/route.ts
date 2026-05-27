import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTrackSchema = z.object({
  name: z.string().min(1).optional(),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { contentIds, ...trackData } = parsed.data;

  const track = await prisma.$transaction(async (tx) => {
    if (contentIds) {
      await tx.trainingCourseItem.deleteMany({ where: { courseId: id } });
      if (contentIds.length > 0) {
        await tx.trainingCourseItem.createMany({
          data: contentIds.map((contentId, i) => ({
            courseId: id,
            contentId,
            sortOrder: i,
          })),
        });
      }
    }

    return tx.trainingCourse.update({
      where: { id },
      data: trackData,
      include: {
        items: {
          include: { content: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { enrollments: true } },
      },
    });
  });

  return NextResponse.json(track);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.trainingCourse.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
