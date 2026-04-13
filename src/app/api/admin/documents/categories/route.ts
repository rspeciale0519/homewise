import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  generateUniqueSlug,
  slugValidationError,
  slugify,
} from "@/lib/slug/slugify";
import { isSlugTakenForDocumentCategory } from "@/lib/slug/resolve";

const SECTION_VALUES = ["office", "listing", "sales"] as const;

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  section: z.enum(SECTION_VALUES),
  sortOrder: z.number().optional(),
});

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const categories = await prisma.documentCategory.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { documents: true } } },
  });

  const shaped = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    section: c.section,
    sortOrder: c.sortOrder,
    documentCount: c._count.documents,
  }));

  return NextResponse.json(shaped);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let slug = parsed.data.slug?.trim();
  if (slug) {
    const err = slugValidationError(slug);
    if (err) {
      return NextResponse.json({ error: err, field: "slug" }, { status: 400 });
    }
    if (await isSlugTakenForDocumentCategory(slug)) {
      return NextResponse.json(
        { error: "That slug is already in use", field: "slug" },
        { status: 409 },
      );
    }
  } else {
    slug = await generateUniqueSlug(
      slugify(`${parsed.data.section}-${parsed.data.title}`),
      isSlugTakenForDocumentCategory,
    );
  }

  const category = await prisma.documentCategory.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      section: parsed.data.section,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
