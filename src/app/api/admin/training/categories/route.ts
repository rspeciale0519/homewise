import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug/slugify";
import { trainingCategoryIdFromName } from "@/lib/training/ids";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().optional(),
  description: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const categories = await prisma.trainingCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { content: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not derive a slug from name", field: "name" },
      { status: 400 },
    );
  }

  const existing = await prisma.trainingCategory.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Slug already in use", field: "slug" },
      { status: 409 },
    );
  }

  const id =
    trainingCategoryIdFromName(parsed.data.name) ?? `cat-${slug}`;

  const category = await prisma.trainingCategory.create({
    data: {
      id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      heroImageUrl: parsed.data.heroImageUrl,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
