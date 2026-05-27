import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
  dripDays: z.number().int().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.trainingSection.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.trainingSection.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;
  const existing = await prisma.trainingSection.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // CASCADE on TrainingCourseItem → drops items in this section too. The
  // curriculum-builder UI (Phase 5) will warn before allowing delete of a
  // non-empty section so this endpoint can stay simple.
  await prisma.trainingSection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
