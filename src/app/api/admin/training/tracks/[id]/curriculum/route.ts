import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const sectionInput = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(120),
  dripDays: z.number().int().nullable().optional(),
  contentIds: z.array(z.string().min(1)),
});

const curriculumSchema = z.object({
  sections: z.array(sectionInput).max(50),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Atomically rebuild a course's curriculum tree.
 *
 * Accepts the full sections + items shape and overwrites the existing
 * arrangement in one transaction. Existing section ids are preserved (so
 * the FK from `TrainingProgress` and from any future drip-state stays
 * stable); sections that aren't in the payload are deleted, which
 * cascade-deletes their items.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;
  const parsed = curriculumSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const course = await prisma.trainingCourse.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { sections } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    // Drop every existing item — they'll be recreated below with their
    // (possibly new) sectionId. CASCADE on TrainingTrackItem→TrainingTrack
    // means we could rebuild from scratch, but doing an explicit deleteMany
    // is clearer about intent.
    await tx.trainingCourseItem.deleteMany({ where: { courseId: id } });

    // Keep existing sections whose id is referenced; delete any that fell
    // out of the payload.
    const existing = await tx.trainingSection.findMany({
      where: { courseId: id },
      select: { id: true },
    });
    const keepIds = new Set(sections.map((s) => s.id).filter(Boolean) as string[]);
    const toDrop = existing
      .map((s) => s.id)
      .filter((existingId) => !keepIds.has(existingId));
    if (toDrop.length > 0) {
      await tx.trainingSection.deleteMany({ where: { id: { in: toDrop } } });
    }

    // Walk the payload in order. Each section becomes a single section row
    // with sortOrder = its index. Items inside follow the order of
    // contentIds[].
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx]!;
      let sectionId: string;
      if (section.id && keepIds.has(section.id)) {
        await tx.trainingSection.update({
          where: { id: section.id },
          data: {
            title: section.title,
            sortOrder: sIdx,
            dripDays: section.dripDays ?? null,
          },
        });
        sectionId = section.id;
      } else {
        const created = await tx.trainingSection.create({
          data: {
            courseId: id,
            title: section.title,
            sortOrder: sIdx,
            dripDays: section.dripDays ?? null,
          },
        });
        sectionId = created.id;
      }

      for (let iIdx = 0; iIdx < section.contentIds.length; iIdx++) {
        await tx.trainingCourseItem.create({
          data: {
            courseId: id,
            sectionId,
            contentId: section.contentIds[iIdx]!,
            sortOrder: iIdx,
          },
        });
      }
    }

    return tx.trainingCourse.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
              include: { content: true },
            },
          },
        },
      },
    });
  });

  return NextResponse.json(updated);
}
