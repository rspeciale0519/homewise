import type { Prisma } from "@prisma/client";
import type { DocumentSection } from "@/types/document-library";

export const CONFIRMATION_PHRASE = "DELETE ALL";

export type BulkDeleteScope =
  | { scopeType: "all" }
  | { scopeType: "section"; section: DocumentSection }
  | { scopeType: "category"; section: DocumentSection; categoryId: string };

export interface BulkDeletePreview {
  documentCount: number;
  draftCount: number;
  favoriteCount: number;
  recentCount: number;
  crossSectionCount: number;
}

export interface BulkDeleteResult {
  success: true;
  documentCount: number;
  draftCount: number;
  favoriteCount: number;
  recentCount: number;
  storageRequested: number;
  storageRemoved: number;
  storageErrors: number;
}

export function buildDocumentWhere(
  scope: BulkDeleteScope,
): Prisma.DocumentWhereInput {
  if (scope.scopeType === "all") return {};
  if (scope.scopeType === "section") {
    return { categories: { some: { category: { section: scope.section } } } };
  }
  return { categories: { some: { categoryId: scope.categoryId } } };
}

export function buildCrossSectionWhere(
  base: Prisma.DocumentWhereInput,
  targetSection: string,
): Prisma.DocumentWhereInput {
  return {
    AND: [
      base,
      { categories: { some: { category: { section: { not: targetSection } } } } },
    ],
  };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
