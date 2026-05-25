import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const bulkUnassignSchema = z.object({
  categoryId: z.string().min(1),
  documentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate documentIds",
    }),
});

interface Failed {
  documentId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkUnassignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { categoryId, documentIds } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.documentCategoryMembership.findMany({
      where: { categoryId, documentId: { in: documentIds } },
      select: { documentId: true },
    });
    const existingIds = new Set(existing.map((m) => m.documentId));
    const removed = documentIds.filter((id) => existingIds.has(id));
    const failed: Failed[] = documentIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ documentId: id, error: "NOT_MEMBER" }));

    if (removed.length > 0) {
      await tx.documentCategoryMembership.deleteMany({
        where: { categoryId, documentId: { in: removed } },
      });

      const remaining = await tx.documentCategoryMembership.findMany({
        where: { categoryId },
        orderBy: { sortOrder: "asc" },
      });
      for (let i = 0; i < remaining.length; i++) {
        await tx.documentCategoryMembership.update({
          where: {
            documentId_categoryId: {
              documentId: remaining[i]!.documentId,
              categoryId,
            },
          },
          data: { sortOrder: i },
        });
      }
    }

    return { removed, failed };
  });

  return NextResponse.json({
    categoryId,
    removed: result.removed,
    failed: result.failed,
  });
}
