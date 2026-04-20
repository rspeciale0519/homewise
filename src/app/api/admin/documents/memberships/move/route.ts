import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  documentId: z.string().min(1),
  fromCategoryId: z.string().min(1),
  toCategoryId: z.string().min(1),
  toIndex: z.number().int().min(0),
});

class NotMemberError extends Error {}

function reindexWithInsertion(
  members: Array<{ documentId: string; sortOrder: number }>,
  movedDocId: string,
  targetIndex: number,
): Array<{ documentId: string }> {
  const without = members.filter((m) => m.documentId !== movedDocId);
  const clamped = Math.min(Math.max(targetIndex, 0), without.length);
  return [
    ...without.slice(0, clamped).map((m) => ({ documentId: m.documentId })),
    { documentId: movedDocId },
    ...without.slice(clamped).map((m) => ({ documentId: m.documentId })),
  ];
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { documentId, fromCategoryId, toCategoryId, toIndex } = parsed.data;

  if (fromCategoryId === toCategoryId) {
    return NextResponse.json(
      { error: "Use reorder endpoint for same-category moves" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fromMembership = await tx.documentCategoryMembership.findUnique({
        where: {
          documentId_categoryId: { documentId, categoryId: fromCategoryId },
        },
      });
      if (!fromMembership) {
        throw new NotMemberError(
          `Document ${documentId} is not a member of ${fromCategoryId}`,
        );
      }

      const existingInTo = await tx.documentCategoryMembership.findUnique({
        where: {
          documentId_categoryId: { documentId, categoryId: toCategoryId },
        },
      });

      await tx.documentCategoryMembership.delete({
        where: {
          documentId_categoryId: { documentId, categoryId: fromCategoryId },
        },
      });

      if (!existingInTo) {
        await tx.documentCategoryMembership.create({
          data: {
            documentId,
            categoryId: toCategoryId,
            sortOrder: toIndex,
          },
        });
      }

      const fromMembers = await tx.documentCategoryMembership.findMany({
        where: { categoryId: fromCategoryId },
        orderBy: { sortOrder: "asc" },
      });
      for (let i = 0; i < fromMembers.length; i++) {
        await tx.documentCategoryMembership.update({
          where: {
            documentId_categoryId: {
              documentId: fromMembers[i]!.documentId,
              categoryId: fromCategoryId,
            },
          },
          data: { sortOrder: i },
        });
      }

      const toMembers = await tx.documentCategoryMembership.findMany({
        where: { categoryId: toCategoryId },
        orderBy: { sortOrder: "asc" },
      });
      const reordered = reindexWithInsertion(toMembers, documentId, toIndex);
      for (let i = 0; i < reordered.length; i++) {
        await tx.documentCategoryMembership.update({
          where: {
            documentId_categoryId: {
              documentId: reordered[i]!.documentId,
              categoryId: toCategoryId,
            },
          },
          data: { sortOrder: i },
        });
      }
    });
  } catch (err) {
    if (err instanceof NotMemberError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
