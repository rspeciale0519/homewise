import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugValidationError } from "@/lib/slug/slugify";
import { isSlugTakenForDocumentCategory } from "@/lib/slug/resolve";

const SECTION_VALUES = ["office", "listing", "sales"] as const;

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  section: z.enum(SECTION_VALUES).optional(),
  sortOrder: z.number().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.documentCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.slug !== undefined) {
    const nextSlug = parsed.data.slug.trim();
    const err = slugValidationError(nextSlug);
    if (err) {
      return NextResponse.json({ error: err, field: "slug" }, { status: 400 });
    }
    if (nextSlug !== existing.slug) {
      if (await isSlugTakenForDocumentCategory(nextSlug, id)) {
        return NextResponse.json(
          { error: "That slug is already in use", field: "slug" },
          { status: 409 },
        );
      }
      data.slug = nextSlug;
    } else {
      delete data.slug;
    }
  }

  const updated = await prisma.documentCategory.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;
  const usage = await prisma.documentCategoryMembership.count({
    where: { categoryId: id },
  });
  if (usage > 0) {
    return NextResponse.json(
      {
        error: `Remove the ${usage} document${usage === 1 ? "" : "s"} in this category first`,
      },
      { status: 409 },
    );
  }

  await prisma.documentCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
