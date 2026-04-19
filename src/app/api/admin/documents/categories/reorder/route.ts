import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  section: z.enum(["office", "listing", "sales"]),
  categoryIds: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { section, categoryIds } = parsed.data;

  const uniqueIds = new Set(categoryIds);
  if (uniqueIds.size !== categoryIds.length) {
    return NextResponse.json(
      { error: "Duplicate category ids" },
      { status: 400 },
    );
  }

  const existing = await prisma.documentCategory.findMany({
    where: { section },
    select: { id: true, section: true },
  });

  if (existing.length !== categoryIds.length) {
    return NextResponse.json(
      { error: "Submitted ids do not match the current section" },
      { status: 400 },
    );
  }
  const existingSet = new Set(existing.map((e) => e.id));
  for (const id of categoryIds) {
    if (!existingSet.has(id)) {
      return NextResponse.json(
        { error: `Category ${id} is not in section ${section}` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < categoryIds.length; i++) {
      await tx.documentCategory.update({
        where: { id: categoryIds[i] },
        data: { sortOrder: i },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
