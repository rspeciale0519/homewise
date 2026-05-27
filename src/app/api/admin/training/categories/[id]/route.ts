import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify, slugValidationError } from "@/lib/slug/slugify";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  heroImageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().optional(),
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

  const existing = await prisma.trainingCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.slug !== undefined) {
    const nextSlug = parsed.data.slug.trim() || slugify(parsed.data.name ?? existing.name);
    const error = slugValidationError(nextSlug);
    if (error) {
      return NextResponse.json({ error, field: "slug" }, { status: 400 });
    }
    if (nextSlug !== existing.slug) {
      const taken = await prisma.trainingCategory.findUnique({
        where: { slug: nextSlug },
      });
      if (taken) {
        return NextResponse.json(
          { error: "Slug already in use", field: "slug" },
          { status: 409 },
        );
      }
      data.slug = nextSlug;
    } else {
      delete data.slug;
    }
  }

  const updated = await prisma.trainingCategory.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;
  const existing = await prisma.trainingCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // FK on TrainingContent.categoryId is ON DELETE SET NULL — content rows
  // survive but lose their category link. The legacy `category` string is
  // preserved as a fallback for one release.
  await prisma.trainingCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
