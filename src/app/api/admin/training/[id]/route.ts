import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { slugValidationError } from "@/lib/slug/slugify";
import {
  isSlugTakenForTraining,
  recordTrainingSlugChange,
} from "@/lib/slug/resolve";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  body: z.string().optional(),
  category: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  audience: z.enum(["agent_only", "public_only", "both"]).optional(),
  type: z.enum(["video", "document", "quiz", "article"]).optional(),
  status: z
    .enum(["draft", "scheduled", "published", "archived"])
    .optional(),
  url: z.string().url().optional(),
  fileKey: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  ogImageUrl: z.string().url().nullable().optional(),
  readTimeMinutes: z.number().int().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;

  const rawBody = await request.json();
  const parsed = updateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.trainingContent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  let previousSlug: string | null = null;

  // Keep the legacy `published` boolean in sync with `status` until v2
  // drops the column. Either field may be supplied; status wins.
  if (parsed.data.status !== undefined) {
    data.published = parsed.data.status === "published";
    if (parsed.data.status === "published" && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  } else if (parsed.data.published !== undefined) {
    if (parsed.data.published) {
      data.status = "published";
      if (!existing.publishedAt) data.publishedAt = new Date();
    } else if (existing.status === "published") {
      // Demote published → draft when the boolean flips off.
      data.status = "draft";
    }
  }

  if (parsed.data.slug !== undefined) {
    const nextSlug = parsed.data.slug.trim();
    const validationError = slugValidationError(nextSlug);
    if (validationError) {
      return NextResponse.json(
        { error: validationError, field: "slug" },
        { status: 400 },
      );
    }
    if (nextSlug !== existing.slug) {
      if (await isSlugTakenForTraining(nextSlug, id)) {
        return NextResponse.json(
          { error: "That slug is already in use", field: "slug" },
          { status: 409 },
        );
      }
      data.slug = nextSlug;
      previousSlug = existing.slug ?? null;
    } else {
      delete data.slug;
    }
  }

  const updated = await prisma.trainingContent.update({
    where: { id },
    data,
  });

  if (previousSlug) {
    await recordTrainingSlugChange(id, previousSlug);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await context.params;

  const record = await prisma.trainingContent.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.fileKey) {
    const supabase = createAdminClient();
    await supabase.storage.from("training-files").remove([record.fileKey]);
  }

  await prisma.trainingContent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
