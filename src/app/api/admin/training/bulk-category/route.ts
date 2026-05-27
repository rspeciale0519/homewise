import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const bulkCategorySchema = z.object({
  contentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate contentIds",
    }),
  toCategoryId: z.string().min(1).nullable(),
});

interface UpdatedRow {
  contentId: string;
  categoryId: string | null;
}
interface FailedRow {
  contentId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { contentIds, toCategoryId } = parsed.data;

  if (toCategoryId !== null) {
    const category = await prisma.trainingCategory.findUnique({
      where: { id: toCategoryId },
      select: { id: true, name: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Target category not found" },
        { status: 404 },
      );
    }
  }

  const existing = await prisma.trainingContent.findMany({
    where: { id: { in: contentIds } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));

  const updated: UpdatedRow[] = [];
  const failed: FailedRow[] = [];

  for (const id of contentIds) {
    if (!existingIds.has(id)) {
      failed.push({ contentId: id, error: "not-found" });
      continue;
    }
    try {
      await prisma.trainingContent.update({
        where: { id },
        data: { categoryId: toCategoryId },
      });
      updated.push({ contentId: id, categoryId: toCategoryId });
    } catch (e) {
      const err = e as { message?: string };
      failed.push({ contentId: id, error: err.message ?? "Unknown error" });
    }
  }

  return NextResponse.json({ toCategoryId, updated, failed });
}
