import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  generateUniqueSlug,
  slugValidationError,
  slugify,
} from "@/lib/slug/slugify";
import { isSlugTakenForDocument } from "@/lib/slug/resolve";

const createSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    url: z.string().url().optional().nullable(),
    external: z.boolean().optional(),
    storageKey: z.string().optional().nullable(),
    storageProvider: z.enum(["local", "supabase"]).optional(),
    mimeType: z.string().optional().nullable(),
    sizeBytes: z.number().optional().nullable(),
    sortOrder: z.number().optional(),
    published: z.boolean().optional(),
    quickAccess: z.boolean().optional(),
    categoryIds: z.array(z.string().min(1)).min(1, "Pick at least one category"),
  })
  .refine(
    (v) => Boolean(v.url) || Boolean(v.storageKey),
    { message: "Provide a URL or upload a file", path: ["url"] },
  );

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const section = request.nextUrl.searchParams.get("section") ?? undefined;

  const documents = await prisma.document.findMany({
    where: section
      ? {
          categories: {
            some: { category: { section } },
          },
        }
      : undefined,
    include: {
      categories: {
        include: {
          category: { select: { id: true, title: true, section: true } },
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const shaped = documents.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    description: d.description,
    url: d.url,
    external: d.external,
    storageKey: d.storageKey,
    storageProvider: d.storageProvider,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    sortOrder: d.sortOrder,
    published: d.published,
    quickAccess: d.quickAccess,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    categories: d.categories.map((m) => ({
      id: m.category.id,
      title: m.category.title,
      section: m.category.section as "office" | "listing" | "sales",
    })),
  }));

  return NextResponse.json(shaped);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstField = Object.keys(fieldErrors)[0];
    const message =
      (firstField && fieldErrors[firstField as keyof typeof fieldErrors]?.[0]) ??
      "Invalid data";
    return NextResponse.json(
      { error: message, field: firstField, details: fieldErrors },
      { status: 400 },
    );
  }

  let slug = parsed.data.slug?.trim();
  if (slug) {
    const err = slugValidationError(slug);
    if (err) {
      return NextResponse.json({ error: err, field: "slug" }, { status: 400 });
    }
    if (await isSlugTakenForDocument(slug)) {
      return NextResponse.json(
        { error: "That slug is already in use", field: "slug" },
        { status: 409 },
      );
    }
  } else {
    slug = await generateUniqueSlug(
      slugify(parsed.data.name),
      isSlugTakenForDocument,
    );
  }

  // Validate categories exist
  const validCategoryCount = await prisma.documentCategory.count({
    where: { id: { in: parsed.data.categoryIds } },
  });
  if (validCategoryCount !== parsed.data.categoryIds.length) {
    return NextResponse.json(
      { error: "One or more categories are invalid", field: "categoryIds" },
      { status: 400 },
    );
  }

  const document = await prisma.document.create({
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description,
      url: parsed.data.url ?? null,
      external: parsed.data.external ?? Boolean(parsed.data.url),
      storageKey: parsed.data.storageKey ?? null,
      storageProvider: parsed.data.storageProvider ?? "local",
      mimeType: parsed.data.mimeType ?? null,
      sizeBytes: parsed.data.sizeBytes ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
      published: parsed.data.published ?? true,
      quickAccess: parsed.data.quickAccess ?? false,
      categories: {
        create: parsed.data.categoryIds.map((categoryId, idx) => ({
          categoryId,
          sortOrder: idx,
        })),
      },
    },
  });

  return NextResponse.json(document, { status: 201 });
}
