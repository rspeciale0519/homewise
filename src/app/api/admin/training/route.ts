import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  generateUniqueSlug,
  slugValidationError,
  slugify,
} from "@/lib/slug/slugify";
import { isSlugTakenForTraining } from "@/lib/slug/resolve";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  body: z.string().optional(),
  category: z.string().min(1),
  audience: z.enum(["agent", "public", "both"]).optional(),
  type: z.enum(["video", "document", "quiz", "article"]).optional(),
  url: z.string().url().optional(),
  fileKey: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const audience = request.nextUrl.searchParams.get("audience") ?? undefined;
  const admin = request.nextUrl.searchParams.get("admin") === "true";

  const where: Record<string, unknown> = {};
  if (!admin) where.published = true;
  if (category) where.category = category;
  if (audience) where.audience = { in: [audience, "both"] };

  const content = await prisma.trainingContent.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(content);
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
    const validationError = slugValidationError(slug);
    if (validationError) {
      return NextResponse.json(
        { error: validationError, field: "slug" },
        { status: 400 },
      );
    }
    if (await isSlugTakenForTraining(slug)) {
      return NextResponse.json(
        { error: "That slug is already in use", field: "slug" },
        { status: 409 },
      );
    }
  } else {
    slug = await generateUniqueSlug(
      slugify(parsed.data.title),
      isSlugTakenForTraining,
    );
  }

  const content = await prisma.trainingContent.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      body: parsed.data.body,
      category: parsed.data.category,
      audience: parsed.data.audience ?? "agent",
      type: parsed.data.type ?? "video",
      url: parsed.data.url,
      fileKey: parsed.data.fileKey,
      thumbnailUrl: parsed.data.thumbnailUrl,
      duration: parsed.data.duration,
      tags: parsed.data.tags ?? [],
    },
  });

  return NextResponse.json(content, { status: 201 });
}
