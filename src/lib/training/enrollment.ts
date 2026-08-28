import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EnrollmentDatabase = Pick<
  Prisma.TransactionClient,
  "trainingCourse" | "trainingEnrollment"
>;

export async function enrollAgentInAutomaticCourses(
  userId: string,
  database: EnrollmentDatabase = prisma,
): Promise<number> {
  const courses = await database.trainingCourse.findMany({
    where: {
      autoEnroll: true,
      audience: { in: ["agent_only", "both"] },
    },
    select: { id: true },
  });

  if (courses.length === 0) return 0;

  const result = await database.trainingEnrollment.createMany({
    data: courses.map(({ id: courseId }) => ({ userId, courseId })),
    skipDuplicates: true,
  });
  return result.count;
}
