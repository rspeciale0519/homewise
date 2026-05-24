import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const bulkAssignSchema = z.object({
  categoryId: z.string().min(1),
  documentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate documentIds",
    }),
});

interface Assigned {
  documentId: string;
  sortOrder: number;
}
interface Skipped {
  documentId: string;
  reason: "already-member";
}
interface Failed {
  documentId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkAssignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { categoryId, documentIds } = parsed.data;

  const category = await prisma.documentCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 },
    );
  }

  const baseSortOrder = await prisma.documentCategoryMembership.count({
    where: { categoryId },
  });

  const assigned: Assigned[] = [];
  const skipped: Skipped[] = [];
  const failed: Failed[] = [];

  for (const documentId of documentIds) {
    try {
      const existing = await prisma.documentCategoryMembership.findUnique({
        where: { documentId_categoryId: { documentId, categoryId } },
      });
      if (existing) {
        skipped.push({ documentId, reason: "already-member" });
        continue;
      }
      const sortOrder = baseSortOrder + assigned.length;
      await prisma.documentCategoryMembership.create({
        data: { documentId, categoryId, sortOrder },
      });
      assigned.push({ documentId, sortOrder });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "P2002") {
        skipped.push({ documentId, reason: "already-member" });
      } else if (err.code === "P2003") {
        failed.push({ documentId, error: "document-not-found" });
      } else {
        failed.push({
          documentId,
          error: err.message ?? "Unknown error",
        });
      }
    }
  }

  return NextResponse.json({ categoryId, assigned, skipped, failed });
}
