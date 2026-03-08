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

  const tracksWithContent = await prisma.trainingTrackItem.findMany({
    where: { contentId },
    select: { trackId: true },
  });

  const trackIds = tracksWithContent.map((t) => t.trackId);

  if (trackIds.length > 0) {
    const userEnrollments = await prisma.trainingEnrollment.findMany({
      where: {
        userId: user.id,
        trackId: { in: trackIds },
        completedAt: null,
      },
      include: {
        track: {
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
      const allDone = enrollment.track.items.every((item) =>
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
