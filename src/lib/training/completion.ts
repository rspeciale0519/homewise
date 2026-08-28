import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CompletionContext =
  | { allowed: true; courseIds: string[] }
  | { allowed: false };

async function getCompletionContext(
  tx: Prisma.TransactionClient,
  userId: string,
  contentId: string,
): Promise<CompletionContext> {
  const content = await tx.trainingContent.findUnique({
    where: { id: contentId },
    select: {
      published: true,
      status: true,
      audience: true,
      courseItems: {
        select: {
          courseId: true,
          course: { select: { audience: true } },
        },
      },
    },
  });

  if (
    !content ||
    !content.published ||
    content.status !== "published" ||
    !["agent_only", "both"].includes(content.audience)
  ) {
    return { allowed: false };
  }

  if (content.courseItems.length === 0) {
    return { allowed: true, courseIds: [] };
  }

  const courseIds = content.courseItems
    .filter(({ course }) => ["agent_only", "both"].includes(course.audience))
    .map(({ courseId }) => courseId);

  if (courseIds.length === 0) return { allowed: false };

  const enrollment = await tx.trainingEnrollment.findFirst({
    where: { userId, courseId: { in: courseIds } },
    select: { id: true },
  });

  return enrollment ? { allowed: true, courseIds } : { allowed: false };
}

export async function completeTrainingContent(
  userId: string,
  contentId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const context = await getCompletionContext(tx, userId, contentId);
    if (!context.allowed) return false;

    const completedAt = new Date();
    await tx.trainingProgress.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId, completed: true, completedAt },
      update: { completed: true, completedAt },
    });

    if (context.courseIds.length === 0) return true;

    const enrollments = await tx.trainingEnrollment.findMany({
      where: { userId, courseId: { in: context.courseIds }, completedAt: null },
      include: {
        course: {
          include: {
            items: {
              where: {
                content: {
                  published: true,
                  status: "published",
                  audience: { in: ["agent_only", "both"] },
                },
              },
              select: {
                contentId: true,
                content: {
                  select: { published: true, status: true, audience: true },
                },
              },
            },
          },
        },
      },
    });
    const visibleItemsByEnrollment = enrollments.map(({ id, course }) => ({
      id,
      contentIds: course.items
        .filter(({ content }) => (
          content.published &&
          content.status === "published" &&
          ["agent_only", "both"].includes(content.audience)
        ))
        .map(({ contentId }) => contentId),
    }));
    const relevantIds = [...new Set(visibleItemsByEnrollment.flatMap(
      ({ contentIds }) => contentIds,
    ))];
    const completedRows = relevantIds.length > 0
      ? await tx.trainingProgress.findMany({
          where: { userId, completed: true, contentId: { in: relevantIds } },
          select: { contentId: true },
        })
      : [];
    const completedIds = new Set(completedRows.map(({ contentId: id }) => id));
    const enrollmentIds = visibleItemsByEnrollment
      .filter(({ contentIds }) => contentIds.length > 0 && contentIds.every(
        (id) => completedIds.has(id),
      ))
      .map(({ id }) => id);

    if (enrollmentIds.length > 0) {
      await tx.trainingEnrollment.updateMany({
        where: { id: { in: enrollmentIds }, userId, completedAt: null },
        data: { completedAt },
      });
    }

    return true;
  });
}

export async function reopenTrainingContent(
  userId: string,
  contentId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const context = await getCompletionContext(tx, userId, contentId);
    if (!context.allowed) return false;

    await tx.trainingProgress.updateMany({
      where: { userId, contentId },
      data: { completed: false, completedAt: null },
    });

    if (context.courseIds.length > 0) {
      await tx.trainingEnrollment.updateMany({
        where: {
          userId,
          courseId: { in: context.courseIds },
          completedAt: { not: null },
        },
        data: { completedAt: null },
      });
    }

    return true;
  });
}
