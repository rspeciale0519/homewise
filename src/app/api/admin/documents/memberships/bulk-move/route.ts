import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const bulkMoveSchema = z.object({
  toCategoryId: z.string().min(1).nullable(),
  moves: z
    .array(
      z.object({
        documentId: z.string().min(1),
        fromCategoryId: z.string().min(1),
      }),
    )
    .min(1)
    .max(50)
    .refine(
      (arr) => new Set(arr.map((m) => m.documentId)).size === arr.length,
      { message: "Duplicate documentIds" },
    ),
});

interface Moved {
  documentId: string;
  sortOrder: number | null;
}
interface Skipped {
  documentId: string;
  reason: "already-member" | "not-in-source";
}
interface Failed {
  documentId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkMoveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { toCategoryId, moves } = parsed.data;

  if (toCategoryId !== null) {
    const category = await prisma.documentCategory.findUnique({
      where: { id: toCategoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }
  }

  const baseTargetSortOrder =
    toCategoryId !== null
      ? await prisma.documentCategoryMembership.count({
          where: { categoryId: toCategoryId },
        })
      : 0;

  const moved: Moved[] = [];
  const skipped: Skipped[] = [];
  const failed: Failed[] = [];
  const affectedSourceCategoryIds = new Set<string>();

  for (const { documentId, fromCategoryId } of moves) {
    try {
      const sourceMembership =
        await prisma.documentCategoryMembership.findUnique({
          where: {
            documentId_categoryId: { documentId, categoryId: fromCategoryId },
          },
        });
      if (!sourceMembership) {
        skipped.push({ documentId, reason: "not-in-source" });
        continue;
      }

      if (toCategoryId === null) {
        await prisma.documentCategoryMembership.delete({
          where: {
            documentId_categoryId: { documentId, categoryId: fromCategoryId },
          },
        });
        affectedSourceCategoryIds.add(fromCategoryId);
        moved.push({ documentId, sortOrder: null });
        continue;
      }

      const targetMembership =
        await prisma.documentCategoryMembership.findUnique({
          where: {
            documentId_categoryId: { documentId, categoryId: toCategoryId },
          },
        });
      if (targetMembership) {
        await prisma.documentCategoryMembership.delete({
          where: {
            documentId_categoryId: { documentId, categoryId: fromCategoryId },
          },
        });
        affectedSourceCategoryIds.add(fromCategoryId);
        skipped.push({ documentId, reason: "already-member" });
        continue;
      }

      const targetSortOrder = baseTargetSortOrder + moved.length;
      await prisma.$transaction(async (tx) => {
        await tx.documentCategoryMembership.delete({
          where: {
            documentId_categoryId: { documentId, categoryId: fromCategoryId },
          },
        });
        await tx.documentCategoryMembership.create({
          data: {
            documentId,
            categoryId: toCategoryId,
            sortOrder: targetSortOrder,
          },
        });
      });
      affectedSourceCategoryIds.add(fromCategoryId);
      moved.push({ documentId, sortOrder: targetSortOrder });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "P2002") {
        skipped.push({ documentId, reason: "already-member" });
      } else if (err.code === "P2003") {
        failed.push({ documentId, error: "document-not-found" });
      } else {
        failed.push({ documentId, error: err.message ?? "Unknown error" });
      }
    }
  }

  await reindexCategories(Array.from(affectedSourceCategoryIds));
  if (toCategoryId !== null) {
    await reindexCategories([toCategoryId]);
  }

  return NextResponse.json({ toCategoryId, moved, skipped, failed });
}

async function reindexCategories(categoryIds: string[]) {
  for (const categoryId of categoryIds) {
    const members = await prisma.documentCategoryMembership.findMany({
      where: { categoryId },
      orderBy: { sortOrder: "asc" },
    });
    for (let i = 0; i < members.length; i++) {
      await prisma.documentCategoryMembership.update({
        where: {
          documentId_categoryId: {
            documentId: members[i]!.documentId,
            categoryId,
          },
        },
        data: { sortOrder: i },
      });
    }
  }
}
