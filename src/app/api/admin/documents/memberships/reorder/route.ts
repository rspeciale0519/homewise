import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string().min(1),
  documentIds: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { categoryId, documentIds } = parsed.data;

  const uniqueDocs = new Set(documentIds);
  if (uniqueDocs.size !== documentIds.length) {
    return NextResponse.json(
      { error: "Duplicate document ids" },
      { status: 400 },
    );
  }

  const existing = await prisma.documentCategoryMembership.findMany({
    where: { categoryId },
    select: { documentId: true },
  });

  if (existing.length !== documentIds.length) {
    return NextResponse.json(
      { error: "Submitted ids do not match current members" },
      { status: 400 },
    );
  }
  const existingSet = new Set(existing.map((e) => e.documentId));
  for (const id of documentIds) {
    if (!existingSet.has(id)) {
      return NextResponse.json(
        { error: `Document ${id} is not a member of category ${categoryId}` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < documentIds.length; i++) {
      await tx.documentCategoryMembership.update({
        where: {
          documentId_categoryId: {
            documentId: documentIds[i]!,
            categoryId,
          },
        },
        data: { sortOrder: i },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
