import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import {
  buildCrossSectionWhere,
  buildDocumentWhere,
  type BulkDeleteScope,
} from "@/lib/documents/bulk-delete";

const scopeSchema = z
  .object({
    scopeType: z.enum(["all", "section", "category"]),
    section: z.enum(["office", "listing", "sales"]).optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      v.scopeType === "all"
        ? !v.section && !v.categoryId
        : v.scopeType === "section"
          ? Boolean(v.section) && !v.categoryId
          : Boolean(v.section) && Boolean(v.categoryId),
    { message: "Invalid scope" },
  );

type ScopeInput = z.infer<typeof scopeSchema>;

type ResolvedScope =
  | { error: NextResponse }
  | { targetSection: null; categoryName: null }
  | { targetSection: string; categoryName: string | null };

async function resolveScope(scope: ScopeInput): Promise<ResolvedScope> {
  if (scope.scopeType === "all") {
    return { targetSection: null, categoryName: null };
  }
  if (scope.scopeType === "section") {
    return { targetSection: scope.section!, categoryName: null };
  }
  const cat = await prisma.documentCategory.findUnique({
    where: { id: scope.categoryId! },
  });
  if (!cat || cat.section !== scope.section) {
    return {
      error: NextResponse.json(
        { error: "Category not found in that section", field: "categoryId" },
        { status: 400 },
      ),
    };
  }
  return { targetSection: scope.section!, categoryName: cat.title };
}

function asScope(s: ScopeInput): BulkDeleteScope {
  if (s.scopeType === "all") return { scopeType: "all" };
  if (s.scopeType === "section") {
    return { scopeType: "section", section: s.section! };
  }
  return { scopeType: "category", section: s.section!, categoryId: s.categoryId! };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const sp = request.nextUrl.searchParams;
  const parsed = scopeSchema.safeParse({
    scopeType: sp.get("scopeType") ?? undefined,
    section: sp.get("section") ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid scope", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const meta = await resolveScope(parsed.data);
  if ("error" in meta) return meta.error;

  const scope = asScope(parsed.data);
  const where = buildDocumentWhere(scope);
  const matched = await prisma.document.findMany({
    where,
    select: { id: true },
  });
  const ids = matched.map((m) => m.id);
  const documentCount = ids.length;

  const [draftCount, favoriteCount, recentCount] = await Promise.all([
    prisma.documentDraft.count({ where: { documentId: { in: ids } } }),
    prisma.documentFavorite.count({ where: { documentId: { in: ids } } }),
    prisma.documentRecent.count({ where: { documentId: { in: ids } } }),
  ]);

  const crossSectionCount =
    meta.targetSection === null
      ? 0
      : await prisma.document.count({
          where: buildCrossSectionWhere(where, meta.targetSection),
        });

  return NextResponse.json({
    documentCount,
    draftCount,
    favoriteCount,
    recentCount,
    crossSectionCount,
  });
}
