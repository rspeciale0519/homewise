import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: contentId } = await params;

  await prisma.trainingProgress.upsert({
    where: { userId_contentId: { userId: user.id, contentId } },
    create: {
      userId: user.id,
      contentId,
      completed: true,
      completedAt: new Date(),
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
  });

  const tracksWithContent = await prisma.trainingCourseItem.findMany({
    where: { contentId },
    select: { courseId: true },
  });

  const trackIds = tracksWithContent.map((t) => t.courseId);

  if (trackIds.length > 0) {
    const userEnrollments = await prisma.trainingEnrollment.findMany({
      where: {
        userId: user.id,
        courseId: { in: trackIds },
        completedAt: null,
      },
      include: {
        course: {
          include: {
            items: { select: { contentId: true } },
          },
        },
      },
    });

    const completedProgress = await prisma.trainingProgress.findMany({
      where: {
        userId: user.id,
        completed: true,
      },
      select: { contentId: true },
    });

    const completedSet = new Set(completedProgress.map((p) => p.contentId));

    const enrollmentsToComplete: string[] = [];

    for (const enrollment of userEnrollments) {
      const allDone = enrollment.course.items.every((item) =>
        completedSet.has(item.contentId),
      );
      if (allDone) {
        enrollmentsToComplete.push(enrollment.id);
      }
    }

    if (enrollmentsToComplete.length > 0) {
      await prisma.trainingEnrollment.updateMany({
        where: { id: { in: enrollmentsToComplete } },
        data: { completedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: contentId } = await params;

  await prisma.trainingProgress.updateMany({
    where: { userId: user.id, contentId },
    data: { completed: false, completedAt: null },
  });

  // Re-open any course enrollments that were marked complete
  const courseItems = await prisma.trainingCourseItem.findMany({
    where: { contentId },
    select: { courseId: true },
  });

  if (courseItems.length > 0) {
    await prisma.trainingEnrollment.updateMany({
      where: {
        userId: user.id,
        courseId: { in: courseItems.map((c) => c.courseId) },
        completedAt: { not: null },
      },
      data: { completedAt: null },
    });
  }

  return NextResponse.json({ success: true });
}
