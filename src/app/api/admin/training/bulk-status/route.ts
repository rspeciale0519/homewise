import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const STATUSES = ["draft", "scheduled", "published", "archived"] as const;

const bulkStatusSchema = z.object({
  contentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate contentIds",
    }),
  status: z.enum(STATUSES),
});

interface UpdatedRow {
  contentId: string;
  status: (typeof STATUSES)[number];
}
interface FailedRow {
  contentId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { contentIds, status } = parsed.data;

  // First pass: find which ids actually exist so we can report not-found
  // distinctly from update failures.
  const existing = await prisma.trainingContent.findMany({
    where: { id: { in: contentIds } },
    select: { id: true, publishedAt: true },
  });
  const existingMap = new Map(existing.map((r) => [r.id, r]));

  const updated: UpdatedRow[] = [];
  const failed: FailedRow[] = [];
  const now = new Date();

  for (const id of contentIds) {
    const row = existingMap.get(id);
    if (!row) {
      failed.push({ contentId: id, error: "not-found" });
      continue;
    }
    try {
      // Keep the legacy `published` boolean in sync until v2 drops it.
      const published = status === "published";
      const publishedAt =
        status === "published" && !row.publishedAt ? now : row.publishedAt;
      await prisma.trainingContent.update({
        where: { id },
        data: { status, published, publishedAt },
      });
      updated.push({ contentId: id, status });
    } catch (e) {
      const err = e as { message?: string };
      failed.push({ contentId: id, error: err.message ?? "Unknown error" });
    }
  }

  return NextResponse.json({ updated, failed });
}
