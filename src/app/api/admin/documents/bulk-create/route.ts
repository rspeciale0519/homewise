import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, slugify } from "@/lib/slug/slugify";
import { isSlugTakenForDocument } from "@/lib/slug/resolve";

const bulkCreateSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        storageKey: z.string().min(1),
        storageProvider: z.literal("supabase"),
        mimeType: z.string().optional().nullable(),
        sizeBytes: z.number().int().nonnegative().optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const created: Array<{ id: string; name: string; slug: string }> = [];
  const failed: Array<{ name: string; error: string }> = [];

  for (const item of parsed.data.items) {
    try {
      const slug = await generateUniqueSlug(
        slugify(item.name),
        isSlugTakenForDocument,
      );
      const doc = await prisma.document.create({
        data: {
          slug,
          name: item.name,
          storageProvider: "supabase",
          storageKey: item.storageKey,
          mimeType: item.mimeType ?? null,
          sizeBytes: item.sizeBytes ?? null,
          published: false,
        },
      });
      created.push({ id: doc.id, name: doc.name, slug: doc.slug });
    } catch (e) {
      failed.push({ name: item.name, error: (e as Error).message });
    }
  }

  return NextResponse.json({ created, failed });
}
