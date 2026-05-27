import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
  dripDays: z.number().int().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const course = await prisma.trainingCourse.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // If sortOrder isn't supplied, append at the tail.
  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const tail = await prisma.trainingSection.findFirst({
      where: { courseId: parsed.data.courseId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    sortOrder = tail ? tail.sortOrder + 1 : 0;
  }

  const section = await prisma.trainingSection.create({
    data: {
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      sortOrder,
      dripDays: parsed.data.dripDays ?? null,
    },
  });

  return NextResponse.json(section, { status: 201 });
}
