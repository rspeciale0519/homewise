import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

const bulkDeleteSchema = z.object({
  contentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate contentIds",
    }),
});

interface DeletedRow {
  contentId: string;
}
interface FailedRow {
  contentId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkDeleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { contentIds } = parsed.data;

  const rows = await prisma.trainingContent.findMany({
    where: { id: { in: contentIds } },
    select: { id: true, fileKey: true },
  });
  const knownIds = new Set(rows.map((r) => r.id));

  const deleted: DeletedRow[] = [];
  const failed: FailedRow[] = [];

  // Collect storage keys to remove in one batched call after the DB
  // deletes succeed. A storage cleanup failure should NOT roll back the DB
  // delete — we'll surface it as a partial failure but the row is gone.
  const storageKeys: string[] = [];

  for (const id of contentIds) {
    if (!knownIds.has(id)) {
      failed.push({ contentId: id, error: "not-found" });
      continue;
    }
    try {
      const row = rows.find((r) => r.id === id);
      await prisma.trainingContent.delete({ where: { id } });
      if (row?.fileKey) storageKeys.push(row.fileKey);
      deleted.push({ contentId: id });
    } catch (e) {
      const err = e as { message?: string };
      failed.push({ contentId: id, error: err.message ?? "Unknown error" });
    }
  }

  if (storageKeys.length > 0) {
    try {
      const supabase = createAdminClient();
      await supabase.storage.from("training-files").remove(storageKeys);
    } catch {
      // Best-effort cleanup; surface nothing here. Orphan files can be
      // swept up by a periodic janitor in v2.
    }
  }

  return NextResponse.json({ deleted, failed });
}
