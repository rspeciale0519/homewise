import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { slugValidationError } from "@/lib/slug/slugify";
import {
  isSlugTakenForDocument,
  recordDocumentSlugChange,
} from "@/lib/slug/resolve";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  external: z.boolean().optional(),
  storageKey: z.string().optional().nullable(),
  storageProvider: z.enum(["local", "supabase"]).optional(),
  mimeType: z.string().optional().nullable(),
  sizeBytes: z.number().optional().nullable(),
  sortOrder: z.number().optional(),
  published: z.boolean().optional(),
  quickAccess: z.boolean().optional(),
  categoryIds: z.array(z.string().min(1)).min(1).optional(),
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

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { categoryIds, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  let previousSlug: string | null = null;

  if (parsed.data.slug !== undefined) {
    const nextSlug = parsed.data.slug.trim();
    const err = slugValidationError(nextSlug);
    if (err) {
      return NextResponse.json({ error: err, field: "slug" }, { status: 400 });
    }
    if (nextSlug !== existing.slug) {
      if (await isSlugTakenForDocument(nextSlug, id)) {
        return NextResponse.json(
          { error: "That slug is already in use", field: "slug" },
          { status: 409 },
        );
      }
      data.slug = nextSlug;
      previousSlug = existing.slug;
    } else {
      delete data.slug;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({ where: { id }, data });

    if (categoryIds) {
      const valid = await tx.documentCategory.count({
        where: { id: { in: categoryIds } },
      });
      if (valid !== categoryIds.length) {
        throw new Error("One or more categories are invalid");
      }
      await tx.documentCategoryMembership.deleteMany({
        where: { documentId: id },
      });
      await tx.documentCategoryMembership.createMany({
        data: categoryIds.map((categoryId, idx) => ({
          documentId: id,
          categoryId,
          sortOrder: idx,
        })),
      });
    }

    return doc;
  });

  if (previousSlug) {
    await recordDocumentSlugChange(id, previousSlug);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;

  const record = await prisma.document.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.storageProvider === "supabase" && record.storageKey) {
    const supabase = createAdminClient();
    await supabase.storage.from("documents").remove([record.storageKey]);
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
